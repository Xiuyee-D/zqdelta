# Run after bin/dev build. Checks the actual production baseurl without rewriting it.
require 'nokogiri'
require 'yaml'
require 'uri'
require 'pathname'
root = File.expand_path('..', __dir__)
destination = File.join(root, '_site')
config = YAML.load_file(File.join(root, '_config.yml'))
baseurl = config.fetch('baseurl')
site_host = URI(config.fetch('url')).host.downcase
abort 'Build _site first with ./bin/dev build' unless File.file?(File.join(destination, 'index.html'))
failures = []
checked = 0
anchors = {}
Dir.glob(File.join(destination, '**/*.html')).each do |file|
  document = Nokogiri::HTML(File.read(file))
  urls = document.css('[href], [src]').flat_map { |node| %w[href src].filter_map { |attr| node[attr] } }
  urls += document.css('[srcset]').flat_map { |node| node['srcset'].split(',').map { |part| part.strip.split(/\s+/).first } }.compact
  relative = Pathname(file).relative_path_from(Pathname(destination)).to_s
  # An emitted index.html corresponds to its directory URL.
  page_path = "#{baseurl}/#{relative.delete_suffix('index.html')}"
  urls.each do |url|
    next if url.start_with?('data:', 'mailto:', 'tel:', 'javascript:') || url.empty?
    begin
      uri = URI.join("https://#{site_host}#{page_path}", url)
      next if uri.host&.downcase != site_host
      route = URI::DEFAULT_PARSER.unescape(uri.path)
      unless route == baseurl || route.start_with?("#{baseurl}/")
        failures << "#{relative}: URL omits #{baseurl}: #{url}"
        next
      end
      path = File.join(destination, route.delete_prefix(baseurl).delete_prefix('/'))
      path = File.join(path, 'index.html') if File.directory?(path) || route.end_with?('/')
      if !File.file?(path) && File.file?("#{path}/index.html") then path = "#{path}/index.html" end
      unless File.file?(path)
        failures << "#{relative}: missing local resource #{url}"
        next
      end
      if uri.fragment && !uri.fragment.empty? && File.extname(path) == '.html'
        ids = anchors[path] ||= Nokogiri::HTML(File.read(path)).css('[id], a[name]').flat_map { |node| [node['id'], node['name']] }.compact
        fragment = URI::DEFAULT_PARSER.unescape(uri.fragment)
        failures << "#{relative}: missing anchor #{url}" unless ids.include?(fragment)
      end
      checked += 1
    rescue URI::Error => error
      failures << "#{relative}: invalid URL #{url.inspect}: #{error.message}"
    end
  end
end
abort failures.uniq.join("\n") unless failures.empty?
puts "Rendered local links passed: #{checked} resources and anchors under #{baseurl}. External URLs are not checked."
