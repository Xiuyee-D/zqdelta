# Run with ./bin/dev bundle exec ruby test/personal_site_test.rb
# Fixtures live in a temporary source tree; personal content is never changed.
require 'jekyll'
require 'tmpdir'
require 'fileutils'
require 'nokogiri'
require 'digest'

root = File.expand_path('..', __dir__)
destination = File.join(root, '.dev-tools', 'personal-site-test-output')

def assert(condition, message)
  raise message unless condition
end

def work_text(document, index)
  heading = document.css('.nano-prose > h3')[index]
  heading.xpath('following-sibling::*').take_while { |node| !%w[h2 h3].include?(node.name) }.map(&:text).join("\n")
end

# Validate the Chinese authoring contract without requiring English synchronization.
chinese_projects = Dir.glob(File.join(root, '_projects/*.zh.md')).filter_map do |path|
  data = YAML.safe_load(File.read(path).split(/^---\s*$\n?/, 3).fetch(1))
  next unless data['published'] == true

  label = File.basename(path)
  assert(label.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\.zh\.md\z/), "#{label}: use lowercase kebab-case and an explicit language suffix")
  english_path = path.sub(/\.zh\.md\z/, '.en.md')
  assert(File.file?(english_path), "#{label}: missing English source with the same basename")
  english_data = YAML.safe_load(File.read(english_path).split(/^---\s*$\n?/, 3).fetch(1))
  assert(english_data['translation_source'] == path.delete_prefix("#{root}/"), "#{label}: English translation_source must point to the renamed Chinese file")
  %w[lang translation_key permalink title description category project_type period].each do |key|
    assert(data[key].is_a?(String) && !data[key].strip.empty?, "#{label}: #{key} must be a nonempty string")
  end
  assert(data['lang'] == 'zh-CN', "#{label}: Chinese project language must be zh-CN")
  assert(data['permalink'] == "/zh/projects/#{data['translation_key']}/", "#{label}: project URL must match its translation key")
  assert(%w[work fun].include?(data['category']), "#{label}: unsupported source category")
  assert(%w[internship research engineering personal].include?(data['project_type']), "#{label}: unsupported project kind")
  %w[topics tech_stack].each do |key|
    values = data[key]
    assert(values.is_a?(Array) && !values.empty? && values.all? { |value| value.is_a?(String) && !value.strip.empty? }, "#{label}: #{key} must be a nonempty string array")
    assert(values.uniq == values, "#{label}: duplicate #{key} entries")
  end
  assert(!data.key?('organization') || (data['organization'].is_a?(String) && !data['organization'].strip.empty?), "#{label}: omit unsupplied organizations")
  assert(!data.key?('importance') || data['importance'].is_a?(Numeric), "#{label}: optional importance must be numeric")
  period = data['period'].match(/\A(\d{4})\.(0[1-9]|1[0-2])—(?:(\d{4})\.(0[1-9]|1[0-2])|(至今))\z/)
  assert(period, "#{label}: use YYYY.MM—YYYY.MM or YYYY.MM—至今")
  if period[5]
    assert(data['status'] == 'ongoing' && !data.key?('sort_date'), "#{label}: ongoing projects need status, not an invented completion month")
  else
    assert(data['sort_date'] == "#{period[3]}-#{period[4]}", "#{label}: sort_date must match the explicit completion month")
    assert("#{period[1]}-#{period[2]}" <= data['sort_date'] && data['status'] != 'ongoing', "#{label}: inconsistent completed project dates or status")
  end
  data
end
%w[translation_key permalink].each do |key|
  values = chinese_projects.map { |data| data.fetch(key) }
  assert(values.uniq == values, "Chinese projects must have unique #{key} values")
end

Dir.mktmpdir('zqdelta-content-') do |source|
  Dir.children(root).each do |name|
    next if %w[.git .dev-tools .local _site _posts _projects _includes _bibliography assets node_modules vendor].include?(name)
    File.symlink(File.join(root, name), File.join(source, name))
  end
  FileUtils.cp_r(File.join(root, '_bibliography'), source)
  FileUtils.cp_r(File.join(root, '_projects'), source)
  FileUtils.cp_r(File.join(root, '_includes'), source)
  # Assets are copied so generated fixtures never write through a source symlink.
  FileUtils.cp_r(File.join(root, 'assets'), source)
  FileUtils.mkdir_p(File.join(source, 'assets/img/publication_preview'))
  FileUtils.mkdir_p(File.join(source, 'assets/pdf'))
  svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#88c0d0"/></svg>'
  File.write(File.join(source, 'assets/img/project-fixture.svg'), svg)
  File.write(File.join(source, 'assets/img/publication_preview/paper-fixture.svg'), svg)
  pdf = "%PDF-1.4\n"
  offsets = [0]
  objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
             '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>']
  objects.each_with_index do |object, index|
    offsets << pdf.bytesize
    pdf << "#{index + 1} 0 obj\n#{object}\nendobj\n"
  end
  xref = pdf.bytesize
  pdf << "xref\n0 4\n0000000000 65535 f \n"
  offsets.drop(1).each { |offset| pdf << format("%010d 00000 n \n", offset) }
  pdf << "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n#{xref}\n%%EOF\n"
  File.binwrite(File.join(source, 'assets/pdf/paper-fixture.pdf'), pdf)
  File.open(File.join(source, '_bibliography/publications.bib'), 'w') do |file|
    file.puts <<~BIB
      @article{layout-fixture,
        title = {Layout verification fixture},
        author = {Example, Alice Anne and Example, Jean-Luc},
        journal = {Test Venue},
        abbr = {TEST},
        year = {2025},
        preview = {paper-fixture.svg},
        preview_width = {100},
        preview_height = {100},
        pdf = {paper-fixture.pdf},
        code = {https://example.org/code},
        abstract = {A temporary abstract used only for layout verification.}
      }
      @unpublished{submission-fixture,
        title = {Provisional submission fixture},
        title_status = {provisional},
        author = {Example, Alice and Example, Bob and Example, Carol and Example, Dana},
        author_limit = {3},
        journal = {Submission Test Journal},
        abbr = {TEST-RRC},
        preview = {paper-fixture.svg},
        preview_width = {100},
        preview_height = {100},
        year = {2026},
        submission_status = {RRC},
        jcr_quartile = {Q1},
        impact_factor = {1.2},
        metrics_year = {2024}
      }
      @unpublished{review-fixture,
        title = {Review fixture without supplied authors},
        journal = {Review Test Journal},
        year = {2026},
        submission_status = {UR}
      }
      @unpublished{draft-fixture,
        title = {Draft paper fixture},
        author = {Example, Alice},
        year = {2026},
        submission_status = {PREPARATION}
      }
      @article{accepted-fixture,
        title = {Accepted paper fixture},
        journal = {Food Chemistry: X},
        abbr = {Food Chem.: X},
        year = {2026},
        submission_status = {accepted}
      }
    BIB
  end
  FileUtils.mkdir_p(File.join(source, '_posts'))
  %w[zh-CN en].each do |lang|
    [2025, 2026].each do |year|
      chinese = lang == 'zh-CN'
      prefix = chinese ? '/zh' : ''
      suffix = chinese ? 'zh' : 'en'
      File.write(File.join(source, "_posts/#{year}-01-01-layout-check.#{suffix}.md"), <<~POST)
        ---
        layout: post
        lang: #{lang}
        translation_key: layout-check-#{year}
        title: #{chinese ? '临时排版检查' : 'Temporary layout check'}
        description: #{chinese ? '只存在于隔离测试中。' : 'Only exists in the isolated test build.'}
        permalink: #{prefix}/blog/#{year}/layout-check/
        published: true
        toc: true
        ---
        ## #{chinese ? '正文' : 'Content'}

        #{chinese ? '这是一段临时正文，不会进入个人站点。' : 'Temporary content that never enters the personal site.'}

        <details data-disclosure><summary>Details</summary><div class="disclosure-body"><p>Expanded content.</p></div></details>

        $$x^2$$
      POST
    end
  end
  # Localized metadata references one Chinese body; no translated-body copy.
  shared_fixture = File.join(source, '_includes/blog-content/layout-check.md')
  File.write(shared_fixture, "## 共享正文\n\n只维护一份中文正文。\n")
  %w[zh-CN en].each do |lang|
    chinese = lang == 'zh-CN'
    suffix = chinese ? 'zh' : 'en'
    prefix = chinese ? '/zh' : ''
    File.write(File.join(source, "_posts/2025-01-01-layout-check.#{suffix}.md"), <<~POST)
      ---
      lang: #{lang}
      translation_key: layout-check-2025
      title: #{chinese ? '临时排版检查' : 'Temporary layout check'}
      permalink: #{prefix}/blog/2025/layout-check/
      published: true
      toc: true
      body_include: blog-content/layout-check.md
      body_lang: zh-CN
      toc_labels:
        共享正文: #{chinese ? '共享正文' : 'Shared content'}
      ---
    POST
  end
  File.write(File.join(source, '_posts/2025-01-01-private.md'), "---\ntitle: Private fixture\n---\nPrivate\n")
  %w[zh-CN en].each do |lang|
    prefix = lang == 'zh-CN' ? '/zh' : ''
    suffix = lang == 'zh-CN' ? '.zh' : ''
    File.write(File.join(source, "_projects/qa_dated#{suffix}.md"), <<~PROJECT)
      ---
      layout: project
      published: true
      lang: #{lang}
      translation_key: qa-dated
      title: Dated verification fixture
      description: Only exists in this isolated test.
      overview_in_facts: false
      permalink: #{prefix}/projects/qa-dated/
      category: work
      importance: -100
      topics: [Testing]
      project_date: 2026-01-01
      sort_date: "2026-01"
      img: assets/img/project-fixture.svg
      img_width: 100
      img_height: 100
      publication_key: layout-fixture
      github: https://example.org/code
      website: https://example.org/demo
      data_url: /assets/pdf/paper-fixture.pdf
      related_posts: [layout-check-2026, nonexistent-note]
      ---
      Temporary project content.
    PROJECT
    File.write(File.join(source, "_projects/qa_following#{suffix}.md"), <<~PROJECT)
      ---
      published: true
      lang: #{lang}
      translation_key: qa-following
      title: Following verification fixture
      description: Tests legacy external links and missing paper keys.
      permalink: #{prefix}/projects/qa-following/
      category: work
      redirect: https://example.org/legacy
      publication_key: nonexistent-paper
      ---
      Temporary content.
    PROJECT
  end
  File.write(File.join(source, '_projects/qa_private.md'), "---\nlang: en\ntitle: Private project fixture\npermalink: /projects/qa-private/\n---\nPrivate\n")
  FileUtils.rm_rf(destination)
  configuration = Jekyll.configuration(
    'config' => File.join(root, '_config.yml'),
    'source' => source,
    'destination' => destination,
    'imagemagick' => { 'enabled' => false },
    'quiet' => true
  )
  site = Jekyll::Site.new(configuration)
  site.process

  assert(File.file?(File.join(destination, '.nojekyll')), 'Publish the prebuilt site with .nojekyll so Pages skips a second Jekyll build')
  not_found = Nokogiri::HTML(File.read(File.join(destination, '404.html')))
  assert(not_found.at_css('meta[name="robots"]')['content'] == 'noindex, follow', 'Keep the utility 404 out of search results')
  assert(not_found.css('meta[http-equiv="refresh"]').empty?, 'The 404 must keep user-controlled homepage links instead of redirecting')
  assert(not_found.at_css('main a[href="/zqdelta/"]') && not_found.at_css('main a[href="/zqdelta/zh/"]'), '404 needs English and Chinese homepage links')
  assert(!File.read(File.join(destination, 'sitemap.xml')).include?('/404.html'), 'The 404 must not enter the sitemap')

  assert(!File.exist?(File.join(destination, 'projects/qa-private/index.html')), 'Projects must remain private without explicit published: true')
  %w[zh-CN en].each do |lang|
    inherited = site.collections.fetch('projects').docs.find { |document| document.data['translation_key'] == 'qa-following' && document.data['lang'] == lang }.data
    assert(inherited['layout'] == 'project' && inherited['overview_in_facts'] == true && inherited['importance'] == 0, 'Project presentation and fallback priority must inherit collection defaults')
  end
  published_project_keys = chinese_projects.map { |data| data.fetch('translation_key') }
  real_projects = site.collections.fetch('projects').docs.select { |document| published_project_keys.include?(document.data['translation_key']) }
  assert(real_projects.length == published_project_keys.length * 2, 'Published projects must retain exactly one source per language after renaming')
  real_projects.select { |document| document.data['lang'] == 'zh-CN' }.each do |chinese|
    english = real_projects.find { |document| document.data['lang'] == 'en' && document.data['translation_key'] == chinese.data['translation_key'] }
    assert(english, "Missing paired English project: #{chinese.data['translation_key']}")
    # Chinese development may intentionally precede translation. Verify paired
    # metadata once the English page records the current Chinese source.
    next unless english.data['translation_source_sha256'] == Digest::SHA256.file(chinese.path).hexdigest

    %w[published category project_type sort_date status].each do |key|
      assert(chinese.data[key] == english.data[key], "Paired project #{key} differs: #{chinese.data['translation_key']}")
    end
    assert(english.data['period'] == chinese.data['period'].sub('至今', 'present'), 'Project periods must match across languages')
    assert(english.data['topics'].length == chinese.data['topics'].length, 'Direction tags must retain the same granularity across languages')
    assert(english.data['tech_stack'] == chinese.data['tech_stack'].map { |entry| entry == '云函数计算' ? 'Function Compute' : entry }, 'Core technologies must match the approved Chinese entries')
    assert(File.read(chinese.path).scan(/^[#]{2,3} /).map(&:length) == File.read(english.path).scan(/^[#]{2,3} /).map(&:length), 'Paired projects must keep the same heading hierarchy')
  end
  component_files, html_files = Dir.glob(File.join(destination, '**/*.html')).partition { |path| path.include?('/assets/voice-terminal/') }
  assert(component_files.map { |path| File.basename(path) } == ['compact.html'], 'Only the compact viewer should be published as an embedded document')
  assert(html_files.length == 31, "Unexpected published page count, including the utility 404: #{html_files.length}")
  html_files.each do |path|
    document = Nokogiri::HTML(File.read(path))
    assert(document.css('.about-profile').length == 1, "Missing shared sidebar: #{path}")
    assert(document.css('.about-contact-links a').length == 3, "Wrong contact count: #{path}")
    assert(document.css('#search-toggle, ninja-keys, #bibsearch, #localized-search-data').empty?, "Search present: #{path}")
    assert(document.css('script[src*="search"]').empty?, "Search scripts present: #{path}")
    back_script = document.at_css('script[src*="vanilla-back-to-top"]')
    assert(back_script && back_script.key?('defer') && back_script['src'].start_with?('/zqdelta/assets/js/third-party/'), 'Back-to-top must load locally without blocking parsing')
    local_script = File.join(destination, back_script['src'].split('?').first.delete_prefix('/zqdelta/'))
    assert(back_script['integrity'] == "sha256-#{[Digest::SHA256.file(local_script).digest].pack('m0')}", 'The published vendor script must retain its verified integrity')
    assert(!document.text.match?(/分钟阅读|min read/), "Reading time must not be published: #{path}")
    next if path == File.join(destination, '404.html') # One bilingual utility page, checked above.
    alternate = document.at_css('[data-language-switch]')
    assert(alternate, "Missing language switch: #{path}")
    target = alternate['href'].delete_prefix('/zqdelta/').sub(%r{/$}, '/index.html')
    target = 'index.html' if target.empty?
    assert(File.file?(File.join(destination, target)), "Broken language counterpart: #{target}")
  end
  ['', 'zh/'].each do |prefix|
    home = Nokogiri::HTML(File.read(File.join(destination, prefix, 'index.html')))
    font_preloads = home.css('link[rel="preload"][as="font"]')
    expected_fonts = [site.data.fetch('fonts').fetch('latin')]
    expected_fonts << site.data.fetch('fonts').fetch('common') unless prefix.empty?
    assert(font_preloads.map { |node| node['href'] } == expected_fonts.map { |font| "/zqdelta#{font}" }, 'Preload only the small primary subsets needed by the page language')
    assert(home.css('link[href*="/assets/fonts/academic-sans.css"]').length == 1, 'Share the generated static font stylesheet')
    assert(home.css('main h1').length == 1 && home.at_css('main h1')['class'] == 'sr-only', 'Keep one accessible homepage heading without a visible biography heading')
    assert(home.at_css('meta[property="og:locale"]')['content'] == (prefix.empty? ? 'en_US' : 'zh_CN'), 'Sharing metadata must use the page language')
    assert(home.at_css('meta[property="og:image"]')['content'] == 'https://xiuyee-d.github.io/zqdelta/assets/img/dzq.png', 'Sharing previews must use the supplied avatar at the production URL')
    assert(home.css('.home-content > h2').map { |h| h['id'] } == %w[news publications educations], 'Home section order changed')
    assert(home.css('.publication-entry').length == 5, 'Publication fixtures did not render')
    paper = home.at_css('#publication-layout-fixture')
    assert(paper.at_css('.publication-authors').text.gsub(/\s+/, ' ').strip == 'Example, A. A., Example, J.-L.', 'Use surnames before initials, preserving compound given names')
    assert(paper.at_css('.publication-journal').text == 'Test Venue', 'Paper journal missing')
    assert(paper.at_css('.publication-citation').element_children.map { |node| node['class'] } == %w[publication-authors publication-title publication-journal], 'Use author-title-journal citation order')
    assert(paper.at_css('.publication-abstract'), 'Paper abstract missing')
    assert(paper.at_css('.publication-links a')['href'] == '/zqdelta/assets/pdf/paper-fixture.pdf', 'PDF baseurl broken')
    assert(paper.at_css('.publication-visual img')['src'].start_with?('/zqdelta/assets/'), 'Preview baseurl broken')
    assert(paper.at_css('.publication-visual img')['width'] == '100' && paper.at_css('.publication-visual img')['height'] == '100', 'Reserve intrinsic preview dimensions')
    assert(!paper.at_css('.publication-citation').text.match?(/\.\./), 'Do not duplicate the period after author initials')
    assert(paper.at_css('.publication-status').nil?, 'Published papers must not inherit submission status')
    assert(paper.at_css('.publication-visual .publication-venue').text == 'TEST', 'Published paper badge must display its journal abbreviation')
    assert(paper.at_css('.publication-venue')['title'] == 'Test Venue', 'Keep the full journal name in the badge tooltip')
    submission = home.at_css('#publication-submission-fixture')
    assert(submission.at_css('.publication-title-note'), 'Provisional title marker missing')
    assert(submission.at_css('.publication-authors').text.gsub(/\s+/, ' ').strip == 'Example, A., Example, B., Example, C., et al.', 'Author display limit must preserve the first three authors')
    assert(!submission.text.include?('Example, D.'), 'Hidden authors leaked into the citation')
    assert(submission.at_css('.publication-visual .publication-status').text == 'Required Reviews Completed', 'Place the full status on the thumbnail')
    assert(submission.at_css('.publication-citation .publication-status').nil? && !submission.at_css('.publication-citation').text.include?('Required Reviews Completed'), 'Remove submission status from the citation')
    assert(submission.at_css('.publication-metadata').text.gsub(/\s+/, ' ').strip == '(JCR:Q1; IF:1.2)', 'Use round parentheses, colons and a semicolon without a metric year')
    assert(submission.at_css('.publication-citation').element_children.last['class'] == 'publication-metadata', 'Metrics and status must follow the citation')
    assert(submission.at_css('.publication-links').nil?, 'Missing resources must not create empty link rows')
    review = home.at_css('#publication-review-fixture')
    assert(review.at_css('.publication-status').text == 'Under Review', 'Use full under-review status')
    assert(review.at_css('.publication-authors').nil?, 'Omit unsupplied authors')
    assert(review.at_css('.publication-visual').nil? && !review['class'].include?('has-preview'), 'Text-only citations must not reserve a visual column')
    assert(review.at_css('.publication-metadata').nil?, 'Status-only entries must not leave empty metric brackets')
    draft = home.at_css('#publication-draft-fixture')
    assert(draft.at_css('.publication-status').text == (prefix.empty? ? 'Manuscript in preparation' : '初稿完成'), 'Localize the unsubmitted manuscript status')
    assert(draft.at_css('.publication-journal').nil? && draft.at_css('.publication-metadata').nil?, 'Unsubmitted drafts must not imply a journal or journal metrics')
    assert(draft.at_css('.publication-citation').text.gsub(/\s+/, ' ').strip == 'Example, A. Draft paper fixture. 2026.', 'Omit missing venues without leaving a stray comma or period')
    accepted = home.at_css('#publication-accepted-fixture')
    assert(accepted.at_css('.publication-venue').text == 'Food Chem.: X', 'Accepted status must preserve the standard journal abbreviation and its punctuation')
    assert(accepted.at_css('.publication-venue')['title'] == 'Food Chemistry: X', 'Accepted badge must retain the full journal name as a tooltip')
    assert(accepted.at_css('.publication-status').nil?, 'Do not display accepted as a pending status')
    blog = Nokogiri::HTML(File.read(File.join(destination, prefix, 'blog/index.html')))
    assert(blog.at_css('meta[property="og:type"]')['content'] == 'website', 'The blog index is a section, not an article')
    assert(blog.css('.blog-year').empty? && blog.css('.blog-page > .nano-list').length == 1, 'Blog must use one list without year groups')
    assert(blog.css('.nano-card').length == 2, 'Wrong localized blog count')
    assert(blog.css('.blog-card-meta time').map { |time| time.text.strip } == %w[2026-01-01 2025-01-01], 'Blog creation dates not descending')
    assert(!blog.text.include?('Private fixture'), 'Private post leaked')
    post = Nokogiri::HTML(File.read(File.join(destination, prefix, 'blog/2026/layout-check/index.html')))
    assert(post.at_css('meta[property="og:type"]')['content'] == 'article', 'Blog details need article sharing metadata')
    assert(home.css('script#MathJax-script').empty?, 'The homepage must not download unused MathJax')
    assert(post.css('script#MathJax-script').length == 1, 'A rendered formula must load MathJax once')
    assert(post.at_css('.nano-back')['href'] == "/zqdelta/#{prefix}blog/#post-layout-check-2026", 'Blog return link broken')
    assert(post.css('.blog-outline .blog-toc-list a').length == 1, 'Blog outline must use real Markdown headings')
    assert(post.css('.blog-toc-inline .blog-toc-list a').length == 1, 'Narrow screens need a native inline outline')
    assert(post.css('[id]').map { |node| node['id'] }.uniq.length == post.css('[id]').length, 'Blog outline must not duplicate element IDs')
    projects = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/index.html')))
    assert(projects.css('.project-group, #work, #fun').empty?, 'Projects must render one list without work/fun groups')
    assert(projects.css('.projects-page > .nano-list').length == 1, 'Projects must use a single unified list')
    assert(projects.css('.nano-header > p').empty?, 'Projects header must omit its tagline')
    assert(projects.css('.project-group summary, details.project-group, .project-group [data-disclosure]').empty?, 'Project categories must stay visible without collapse controls')
    expected_card_count = 9
    facts_labels = prefix.empty? ? ['Project overview', 'Project areas', 'Core technologies'] : ['项目概述', '项目方向', '核心技术']
    assert(projects.css('.nano-card').length == expected_card_count, 'Expected localized real projects and two isolated test projects')
    assert(projects.css('.project-card-primary > .nano-arrow').length == expected_card_count, 'Each project card must retain its animated detail arrow')
    projects.css('.project-card-primary').each do |card|
      title = card.at_css('h2')
      description = card.at_css('p')
      assert(card['aria-labelledby'] == title['id'], 'A project link must be named by its visible title')
      assert(card['aria-describedby'] == description['id'], 'The full description must remain available to assistive technology') if description
      children = card.element_children
      copy_index = children.index(card.at_css('.nano-card-copy'))
      labels = card.at_css('.project-card-labels')
      assert(copy_index < children.index(labels), 'The shared metadata row must follow the title and description') if labels
      assert(card.css('.project-card-meta').empty?, 'Date must not occupy a separate metadata row')
      if card.at_css('.project-card-date')
        assert(labels.element_children.first['class'] == 'project-card-date', 'Explicit date must lead the shared metadata row')
      end
    end
    project_order = %w[olfactory-flavor-perception multimodal-sentiment-analysis family-recipe-manager qa-dated portable-ai-voice-terminal integrated-test-control railway-accident-graph railway-knowledge qa-following]
    assert(projects.css('.project-card-primary').map { |link| link['href'] } == project_order.map { |key| "/zqdelta/#{prefix}projects/#{key}/" }, 'Ongoing projects must lead, followed by descending completion dates and other undated projects')
    assert(projects.css('a a').empty?, 'Resource links must not be nested inside detail links')
    assert(projects.css('.project-resources, .project-card-organization, .project-badge').empty?, 'Project cards must omit resources, organizations, and status badges')
    railway_card = projects.at_css('#railway-knowledge .project-card-primary')
    assert(railway_card.at_css('.project-card-kind').text == (prefix.empty? ? 'Internship' : '实习'), 'Project kind must have its own localized label')
    railway_data = site.collections.fetch('projects').docs.find { |document| document.data['translation_key'] == 'railway-knowledge' && document.data['lang'] == (prefix.empty? ? 'en' : 'zh-CN') }.data
    assert(railway_card.css('.project-card-topic').map { |tag| tag.text.strip } == railway_data.fetch('topics'), 'Project direction tags must match the current localized content')
    assert(railway_card.at_css('.project-card-date').text == railway_data.fetch('period'), 'Card must retain the explicit internship period')
    assert(!projects.text.include?('Test author'), 'Roles belong on project detail pages')
    real_project_keys = %w[railway-knowledge railway-accident-graph integrated-test-control portable-ai-voice-terminal family-recipe-manager olfactory-flavor-perception]
    real_project_keys << 'multimodal-sentiment-analysis'
    real_project_keys.each do |key|
      data = site.collections.fetch('projects').docs.find { |document| document.data['translation_key'] == key && document.data['lang'] == (prefix.empty? ? 'en' : 'zh-CN') }.data
      detail = Nokogiri::HTML(File.read(File.join(destination, prefix, "projects/#{key}/index.html")))
      values = detail.css('.project-facts .project-fact-values')
      assert(values.length == 2, 'Research areas and technologies must each render a semantic list')
      assert(values[0].css('li').map { |item| item.text.strip } == data.fetch('topics'), 'Detail research areas must match the localized source')
      assert(values[1].css('li').map { |item| item.text.strip } == data.fetch('tech_stack'), 'Detail technology entries must match the localized source')
      assert(detail.css('.project-facts dt').map { |label| label.text.strip } == facts_labels, 'Both languages must share the same three localized facts rows')
      assert(detail.css('.project-context').length == 1, 'Project details must present their explicit period below the title')
      assert(detail.at_css('.project-context-period').text.strip.end_with?(data.fetch('period')), 'Detail period must match the project card')
      partner = detail.at_css('.project-context-partner')
      if data['organization']
        label = prefix.empty? ? 'Partner organization: ' : '合作单位：'
        assert(partner && partner.text.strip == "#{label}#{data['organization']}", 'Partner must use the localized label and supplied name')
      else
        assert(partner.nil?, 'Do not invent a partner or render an empty organization placeholder')
      end
      assert(data['role'].nil?, 'Project metadata must omit responsibilities now documented in the body')
      if %w[railway-knowledge railway-accident-graph integrated-test-control portable-ai-voice-terminal multimodal-sentiment-analysis].include?(key)
        assert(detail.css('.nano-prose > h2').map { |heading| heading['id'] } == %w[background contributions], 'Deliverables must belong to work subsections without a separate outcomes chapter')
        expected_work_count = key == 'railway-accident-graph' ? 2 : 3
        assert(detail.css('.nano-prose > h3').length == expected_work_count, 'Retain work subsections without outcome headings')
        assert(detail.css('.nano-prose ul, .nano-prose ol, .nano-prose table, .project-highlights').empty?, 'Merged deliverables must remain continuous prose')
      end
    end
    project = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/qa-dated/index.html')))
    assert(project.at_css('.project-detail .nano-prose .detail-cover'), 'Project cover must belong to the reading article')
    cover = project.at_css('.detail-cover img')
    assert(cover['width'].to_i > 0 && cover['height'].to_i > 0, 'Project cover must reserve its intrinsic dimensions')
    assert(project.at_css('.detail-header .detail-summary'), 'Project summary must precede the cover')
    resources = project.css('.project-resources a').map { |link| link['href'] }
    assert(resources == ["/zqdelta/#{prefix}#publication-layout-fixture", 'https://example.org/code', 'https://example.org/demo', '/zqdelta/assets/pdf/paper-fixture.pdf'], "Project resources or bibliography association broken: #{resources}")
    assert(project.at_css('.project-related a')['href'] == "/zqdelta/#{prefix}blog/2026/layout-check/", 'Localized related note broken')
    assert(project.css('.project-related a').length == 1, 'Missing notes must be omitted')
    assert(project.at_css('.project-next')['href'] == "/zqdelta/#{prefix}projects/portable-ai-voice-terminal/", 'Next project order broken')
    railway = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/railway-knowledge/index.html')))
    assert(railway.css('.project-template-note').empty?, 'Real internship must not be labeled a template')
    assert(railway.at_css('.project-meta').text.strip == (prefix.empty? ? 'Internship' : '实习'), 'Internship detail metadata should contain only the project kind')
    assert(railway.css('.project-facts dt').map { |label| label.text.strip } == facts_labels, 'Internship facts must follow the requested order')
    assert(railway.at_css('.project-facts dd').text == railway_card.at_css('p').text, 'Detail overview must reuse the card description')
    assert(railway.css('.project-highlights, .project-workflow, .project-work-label, .nano-prose table, .detail-summary').empty?, 'Internship should retain the source prose without added summaries, diagrams, or tables')
    (prefix.empty? ? ['1,000+', '500+', '2,000+'] : ['1,000 余本', '500 余份', '2,000 余篇']).each do |volume|
      assert(railway.at_css('.nano-prose').text.include?(volume), 'Supplied personal processing volume missing')
      assert(work_text(railway, 0).include?(volume), 'Personal corpus volumes must remain beside document processing')
      assert(railway.at_css('.nano-prose').text.scan(volume).length == 1, 'Do not repeat corpus volumes across work and outcomes')
    end
    assert(railway.css('.project-section-nav').empty?, 'Project details should not display a table of contents')
    assert(railway.css('.project-resources').empty?, 'No public resource URLs were supplied for this internship')
    assert(railway.at_css('.project-previous')['href'].end_with?('/railway-accident-graph/'), 'The research project must precede the internship by completion date')
    assert(railway.at_css('.project-next')['href'].end_with?('/qa-following/'), 'Other undated projects must follow completion-dated projects')
    accident_card = projects.at_css('#railway-accident-graph .project-card-primary')
    accident_data = site.collections.fetch('projects').docs.find { |document| document.data['translation_key'] == 'railway-accident-graph' && document.data['lang'] == (prefix.empty? ? 'en' : 'zh-CN') }.data
    assert(accident_card.at_css('.project-card-date').text == accident_data.fetch('period'), 'Card must retain the current research project period')
    assert(accident_card.at_css('.project-card-kind').text == (prefix.empty? ? 'Research' : '科研'), 'Research card must show its correct kind')
    accident = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/railway-accident-graph/index.html')))
    assert(accident.at_css('.project-facts dd').text == accident_card.at_css('p').text, 'Research overview must match its card')
    assert(accident.at_css('.project-meta').text.strip == (prefix.empty? ? 'Research' : '科研'), 'Research detail metadata must match its card kind')
    assert(accident.css('.project-facts dt').map { |label| label.text.strip } == facts_labels, 'Research project must use a generic organization label')
    patent = accident.at_css('#patent')
    patent_text = patent.name == 'p' ? patent.text : patent.next_element.text
    assert(patent_text.include?('CN121189315A'), 'Supplied patent publication number and anchor must remain')
    assert(accident.at_css('.nano-prose').text.scan('CN121189315A').length == 1, 'Patent must appear once')
    assert(patent.name == 'p' && work_text(accident, 0).include?(patent_text), 'Patent must be a short paragraph in the entity-extraction subsection')
    if prefix == 'zh/'
      assert(patent_text.include?('一种面向高速铁路技改大修项目文本的命名实体识别方法'), 'Supplied Chinese patent title must remain exact')
    end
    assert(accident.css('.project-section-nav, .project-resources, .detail-summary, .project-template-note').empty?, 'Research project must omit TOC, invented resources, and duplicate summaries')
    assert(accident.at_css('.project-previous')['href'].end_with?('/integrated-test-control/'), 'The later-completed engineering project must precede the research project')
    assert(accident.at_css('.project-next')['href'].end_with?('/railway-knowledge/'), 'The research project must lead to the internship by completion date')
    engineering_card = projects.at_css('#integrated-test-control .project-card-primary')
    engineering_data = site.collections.fetch('projects').docs.find { |document| document.data['translation_key'] == 'integrated-test-control' && document.data['lang'] == (prefix.empty? ? 'en' : 'zh-CN') }.data
    engineering = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/integrated-test-control/index.html')))
    engineering_kind = prefix.empty? ? 'Engineering' : '工程'
    assert(engineering_card.at_css('.project-card-kind').text == engineering_kind && engineering.at_css('.project-meta').text.strip == engineering_kind, 'Engineering card and detail must show the same localized kind')
    assert(engineering_card.at_css('.project-card-date').text == engineering_data.fetch('period'), 'Engineering period missing from card')
    assert(engineering.css('.project-facts dt').map { |label| label.text.strip } == facts_labels, 'Engineering facts must render without an organization or empty institution row')
    assert(engineering.at_css('.project-facts dd').text == engineering_card.at_css('p').text, 'Engineering overview must reuse its card description')
    assert(engineering.at_css('.nano-prose').text.include?(prefix.empty? ? '3 device categories' : '3 类设备'), 'Supplied device category count missing')
    assert(engineering.css('.project-section-nav, .project-resources, .detail-summary, .project-template-note, .nano-prose ul, .nano-prose ol').empty?, 'Engineering details must use prose without TOC, placeholder resources, or result lists')
    assert(engineering.at_css('.project-previous')['href'].end_with?('/portable-ai-voice-terminal/') && engineering.at_css('.project-next')['href'].end_with?('/railway-accident-graph/'), 'Engineering sibling navigation must follow descending completion dates')
    voice_card = projects.at_css('#portable-ai-voice-terminal .project-card-primary')
    voice = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/portable-ai-voice-terminal/index.html')))
    assert(voice_card.at_css('.project-card-kind').text == engineering_kind && voice.at_css('.project-meta').text.strip == engineering_kind, 'Voice terminal must use the engineering kind on its card and detail')
    assert(voice_card.at_css('.project-card-date').text == '2024.12—2025.12', 'Voice terminal card must retain its supplied period')
    assert(voice.css('.project-facts dt').map { |label| label.text.strip } == facts_labels, 'Voice terminal facts must omit unsupplied organization and role rows')
    assert(voice.at_css('.project-facts dd').text == voice_card.at_css('p').text, 'Voice terminal overview must reuse its card description')
    viewer = voice.at_css('figure.voice-terminal')
    assert(viewer && voice.css('figure.voice-terminal').length == 1, 'Voice terminal must contain one compact structure figure')
    assert(viewer['data-src'] == "/zqdelta/assets/voice-terminal/compact.html?lang=#{prefix.empty? ? 'en' : 'zh-CN'}", 'Viewer language and baseurl must be explicit')
    assert(viewer.css('iframe').empty?, '3D iframe must be created only after activation')
    assert(viewer.at_css('figcaption').text.include?(prefix.empty? ? 'does not include a battery, speaker, or tactile switches' : '不含电池、扬声器和轻触开关'), 'Model scope must be clear in both languages')
    assert(viewer.css('img').all? { |image| image['width'] == '1000' && image['height'] == '1000' }, 'Posters must reserve their real dimensions')
    viewer.css('img').each do |image|
      assert(File.file?(File.join(destination, image['src'].delete_prefix('/zqdelta/'))), 'Viewer poster missing from build')
    end
    if prefix == 'zh/'
      assert(work_text(voice, 0).include?('整机外壳') && work_text(voice, 0).include?('4 × 3 × 5 cm（长 × 宽 × 高）'), 'Voice terminal must retain the supplied case dimensions and axis order in centimeters')
      %w[SMT 后焊 单板烧录 PCBA 样机组装与功能调试 DFM DFT 作业指导书（SOP）].each do |fact|
        assert(work_text(voice, 2).include?(fact), "Trial-production work missing supplied fact: #{fact}")
      end
      ['3 类设备', '用户使用手册'].each do |fact|
        assert(work_text(engineering, 2).include?(fact), "Integration and delivery work missing: #{fact}")
      end
    end
    assert(voice.css('.project-section-nav, .project-resources, .detail-summary, .project-template-note, .nano-prose ul, .nano-prose ol').empty?, 'Voice terminal details must omit TOC, placeholder resources, duplicate summary, and result lists')
    assert(voice.at_css('.project-previous')['href'].end_with?('/qa-dated/') && voice.at_css('.project-next')['href'].end_with?('/integrated-test-control/'), 'Voice terminal navigation must use its completion date rather than its start date')
    recipe_card = projects.at_css('#family-recipe-manager .project-card-primary')
    recipe = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/family-recipe-manager/index.html')))
    personal_kind = prefix.empty? ? 'Hobby' : '兴趣'
    assert(recipe_card.at_css('.project-card-kind').text == personal_kind && recipe.at_css('.project-meta').text.strip == personal_kind, 'Personal project kind must be localized consistently on the card and detail')
    assert(recipe_card.at_css('.project-card-date').text == '2026.02—2026.03', 'Personal project must retain its supplied development period')
    assert(recipe.css('.project-facts dt').map { |label| label.text.strip } == facts_labels, 'Personal project facts must omit unsupplied institution and role fields')
    assert(recipe.at_css('.project-facts dd').text == recipe_card.at_css('p').text, 'Personal project facts must reuse the supplied overview')
    assert(recipe.css('.nano-prose > h2').map { |heading| heading['id'] } == %w[motivation contributions reflection], 'Personal project must retain motivation, work, and reflection sections')
    assert(recipe.css('.nano-prose > h3').length == 7 && recipe.css('.nano-prose > p').length == 9, 'Personal project must retain two motivation paragraphs, four work subsections, and three reflections')
    assert(recipe.css('.project-section-nav, .project-resources, .detail-summary, .project-template-note, .nano-prose ul, .nano-prose ol').empty?, 'Personal project must use prose without invented resources, template labels, duplicate summaries, or TOC')
    recipe_previous = 'multimodal-sentiment-analysis'
    assert(recipe.at_css('.project-previous')['href'].end_with?("/#{recipe_previous}/") && recipe.at_css('.project-next')['href'].end_with?('/qa-dated/'), 'Recipe navigation must follow the localized completion-date order across categories')
    olfactory_card = projects.at_css('#olfactory-flavor-perception .project-card-primary')
    olfactory = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/olfactory-flavor-perception/index.html')))
    olfactory_data = site.collections.fetch('projects').docs.find { |document| document.data['translation_key'] == 'olfactory-flavor-perception' && document.data['lang'] == (prefix.empty? ? 'en' : 'zh-CN') }.data
    assert(olfactory_data['status'] == 'ongoing' && olfactory_data['sort_date'].nil?, 'Ongoing research must not invent a completion date')
    assert(olfactory_data['organization'] == '北京工商大学食品与健康学院', 'Chinese thesis partner must be the School of Food and Health') if prefix == 'zh/'
    assert(olfactory_card.at_css('.project-card-date').text == (prefix.empty? ? '2025.09—present' : '2025.09—至今'), 'Research period must remain open-ended')
    assert(olfactory_card.at_css('.project-card-kind').text == (prefix.empty? ? 'Research' : '科研'), 'Thesis project must use the research kind')
    assert(olfactory.at_css('.project-facts-overview dd').text == olfactory_card.at_css('p').text, 'Thesis overview must reuse its card description')
    assert(olfactory.css('.nano-prose > h2').map { |heading| heading['id'] } == %w[background architecture contributions], 'Thesis section structure must match in both languages')
    assert(olfactory.css('.nano-prose > h3').length == 3, 'Thesis must retain implementation, dataset construction, and modeling subsections')
    progress_heading = prefix.empty? ? 'Perception modeling' : '感知建模'
    assert(olfactory.css('.nano-prose > h3').last.text == progress_heading, 'Modeling progress belongs in its work subsection')
    progress = work_text(olfactory, 2)
    stage = prefix.empty? ? 'the modeling method remains under exploration' : '具体建模方法仍在探索中'
    assert(progress.include?(stage), 'Thesis must retain the confirmed exploratory modeling stage')
    assert(!olfactory.at_css('.nano-prose').text.match?(/食品条件|food matrices|food conditions|PyTorch/), 'Thesis prose must omit food-condition inputs and claims of a settled PyTorch model')
    assert(!olfactory.at_css('.nano-prose').text.match?(/1,978|1978|49 名|62 个|49 unique|62 acquisition|Windows/), 'Both languages must show only the dataset actually used and omit weakly related platform details')
    (prefix.empty? ? ['30 participants', '908 events'] : ['30 名受试者', '908 个事件']).each do |value|
      assert(olfactory.at_css('.nano-prose').text.include?(value), "Supplied thesis scope missing: #{value}")
    end
    diagram = olfactory.at_css('.nano-prose figure img')
    assert(diagram && diagram['width'] == '2400' && diagram['height'] == '1350', 'Architecture image must reserve its original dimensions')
    assert(diagram['src'] == '/zqdelta/assets/img/projects/olfactory-flavor-perception/system-architecture.png', 'Architecture image baseurl is incorrect')
    assert(File.file?(File.join(destination, diagram['src'].delete_prefix('/zqdelta/'))), 'Architecture image missing from the build')
    assert(diagram.parent.name == 'figure' && diagram.ancestors('a').empty?, 'Architecture diagram must display inline without an image link in both languages')
    assert(!diagram.parent.at_css('figcaption').text.include?('点击图片'), 'Architecture caption must omit the removed image-link instruction')
    assert(olfactory.css('.project-resources, .detail-summary, .detail-cover, .nano-prose table, .nano-prose ul, .nano-prose ol').empty?, 'Do not add placeholder resources, duplicate summaries, covers, or outcome lists')
    latest_completed = 'multimodal-sentiment-analysis'
    assert(olfactory.css('.project-previous').empty? && olfactory.at_css('.project-next')['href'].end_with?("/#{latest_completed}/"), 'Ongoing research must lead the list and link to the most recently completed project')
    msa = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/multimodal-sentiment-analysis/index.html')))
    assert(msa.at_css('.project-meta').text.strip == (prefix.empty? ? 'Research' : '科研'), 'MSA must use the research kind')
    assert(msa.at_css('.project-context-period').text.strip.end_with?('2026.03—2026.07'), 'MSA must retain the supplied research period')
    assert(msa.at_css('.project-previous')['href'].end_with?('/olfactory-flavor-perception/') && msa.at_css('.project-next')['href'].end_with?('/family-recipe-manager/'), 'MSA navigation must connect ongoing research and the next completed project')
    assert(msa.css('.detail-summary, .project-resources, .project-section-nav, .project-highlights').empty?, 'MSA must retain the continuous-reading layout without duplicate overview or placeholder resources')
    msa_diagram = msa.at_css('.nano-prose figure img')
    assert(msa_diagram && msa_diagram['width'] == '2400' && msa_diagram['height'] == '1302', 'TARF architecture must reserve its original rendered aspect ratio')
    assert(msa_diagram['src'] == '/zqdelta/assets/img/projects/multimodal-sentiment-analysis/tarf-architecture.png', 'TARF architecture asset must retain the production baseurl')
    assert(File.file?(File.join(destination, msa_diagram['src'].delete_prefix('/zqdelta/'))), 'TARF architecture image missing from the build')
    assert(msa_diagram.parent.name == 'figure' && msa_diagram.ancestors('a').empty?, 'TARF architecture must display inline')
    assert(msa_diagram.parent.xpath('following-sibling::h2').first['id'] == 'contributions', 'TARF overview diagram should precede the detailed work')
    following = Nokogiri::HTML(File.read(File.join(destination, prefix, 'projects/qa-following/index.html')))
    assert(following.css('.project-facts-overview dd').length == 1 && following.css('.detail-summary').empty?, 'An overview in the facts must suppress the fallback summary even without summary: false')
    assert(following.at_css('.project-previous')['href'].end_with?('/railway-knowledge/') && following.css('.project-next').empty?, 'Other undated projects must remain after all completion-dated projects')
    assert(following.css('meta[http-equiv="refresh"]').empty?, 'Project detail must not automatically redirect')
    assert(following.css('.project-resources a').map { |link| link['href'] } == ['https://example.org/legacy'], 'Missing paper should be omitted; legacy demo must remain accessible')
    (1..9).each do |id|
      assert(!File.exist?(File.join(destination, prefix, "projects/#{id}_project/index.html")), 'Removed project example still published')
      assert(!File.read(File.join(destination, 'sitemap.xml')).include?("/#{prefix}projects/#{id}_project/"), 'Removed project example leaked into sitemap')
    end
    assert(!File.exist?(File.join(destination, prefix, 'publications/index.html')), 'Standalone publications still published')
    assert(blog.css('.nano-header > p').empty?, 'Blog header must omit its tagline')
    awards = Nokogiri::HTML(File.read(File.join(destination, prefix, 'awards/index.html')))
    assert(awards.css('.post-header .post-description').empty?, 'Awards header must omit its tagline')
  end
end
  shared_chinese = Nokogiri::HTML(File.read(File.join(destination, 'zh/blog/2025/layout-check/index.html')))
  shared_english = Nokogiri::HTML(File.read(File.join(destination, 'blog/2025/layout-check/index.html')))
  assert(shared_chinese.at_css('.nano-prose').inner_html == shared_english.at_css('.nano-prose').inner_html, 'Localized article views must render the same shared body')
  assert(shared_english.at_css('.nano-prose')['lang'] == 'zh-CN', 'Keep Chinese prose language separate from the English interface')
  assert(shared_english.at_css('.blog-toc-list a').text == 'Shared content', 'Translate the English outline without changing body headings')
  assert(shared_english.at_css('.blog-toc-list a')['href'] == shared_chinese.at_css('.blog-toc-list a')['href'], 'Translated outlines must keep the original anchors')
  assert(shared_english.at_css('.blog-detail-meta .blog-language').text == 'Body: Chinese', 'Label the unchanged body language in the English interface')
  puts 'Personal-site integration passed: isolated bilingual posts, ordered blog list, reading outlines, paper cards, shared sidebars, language links, hidden routes, and no search.'
