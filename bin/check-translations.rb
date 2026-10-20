#!/usr/bin/env ruby
# Record fingerprints only after the English translation has been updated.
require 'yaml'
require 'digest'
require 'date'

Dir.chdir(File.expand_path('..', __dir__))
record = ARGV.delete('--record')
abort 'Usage: ./bin/dev translations [--record]' unless ARGV.empty?

def read_metadata(path)
  contents = File.read(path, encoding: 'UTF-8')
  match = contents.match(/\A---\r?\n(.*?)\r?\n---(?:\r?\n|\z)/m) if path.end_with?('.md')
  raise "Missing front matter: #{path}" if path.end_with?('.md') && !match

  yaml = match ? match[1] : contents
  data = YAML.safe_load(yaml, permitted_classes: [Date, Time], aliases: true)
  raise "Invalid metadata: #{path}" unless data.is_a?(Hash)

  [data, contents, match]
end

page_sources = %w[about projects blog awards].map { |name| "_pages/#{name}-zh.md" }
page_sources |= Dir.glob('_pages/*-zh.md')
pairs = page_sources.sort.map { |path| [path, path.sub('-zh.md', '.md')] }
project_sources = Dir.glob('_projects/*.zh.md')
project_sources |= Dir.glob('_projects/*.en.md').map { |path| path.sub('.en.md', '.zh.md') }
pairs += project_sources.sort.map { |path| [path, path.sub('.zh.md', '.en.md')] }
post_sources = Dir.glob('_posts/*.zh.md')
post_sources |= Dir.glob('_posts/*.en.md').map { |path| path.sub('.en.md', '.zh.md') }
pairs += post_sources.sort.map { |path| [path, path.sub('.zh.md', '.en.md')] }
pairs << ['_data/i18n/zh-CN.yml', '_data/i18n/en.yml']
failures = []
recorded_contents = {}

pairs.each do |chinese_path, english_path|
  unless File.file?(chinese_path)
    failures << "Missing Chinese source: #{chinese_path}"
    next
  end
  unless File.file?(english_path)
    failures << "Missing English counterpart: #{english_path}"
    next
  end

  begin
    chinese, = read_metadata(chinese_path)
    english, contents, match = read_metadata(english_path)
  rescue Psych::Exception, RuntimeError => error
    failures << "Invalid metadata in #{chinese_path} / #{english_path}: #{error.message}"
    next
  end
  if chinese['lang'] != 'zh-CN' || english['lang'] != 'en'
    failures << "Incorrect language metadata: #{chinese_path} / #{english_path}"
  end
  if chinese['translation_key'] != english['translation_key'] || (chinese_path.end_with?('.md') && chinese['translation_key'].to_s.empty?)
    failures << "Translation keys differ: #{chinese_path} / #{english_path}"
  end
  if english['translation_source'] != chinese_path
    failures << "Set translation_source: #{chinese_path} in #{english_path}"
    next
  end

  if chinese_path.start_with?('_posts/') && (chinese['body_include'] || english['body_include'])
    shared_path = chinese['body_include'].to_s
    if !shared_path.match?(%r{\Ablog-content/[a-z0-9]+(?:-[a-z0-9]+)*\.md\z}) || english['body_include'] != shared_path || !File.file?(File.join('_includes', shared_path))
      failures << "Blog counterparts must reference the same existing shared body: #{chinese_path} / #{english_path}"
    end
    if english['body_lang'] != 'zh-CN' || !english['toc_labels'].is_a?(Hash) || english['toc_labels'].empty?
      failures << "English blog metadata needs Chinese body language and translated outline labels: #{english_path}"
    end
    [chinese_path, english_path].each do |path|
      _, text, front_matter = read_metadata(path)
      unless text[front_matter.end(0)..].to_s.strip.empty?
        failures << "Keep the shared blog body out of localized metadata files: #{path}"
      end
    end
  end

  digest = Digest::SHA256.file(chinese_path).hexdigest
  if record
    yaml = match ? match[1] : contents
    line = "translation_source_sha256: #{digest}"
    yaml = if yaml.match?(/^translation_source_sha256:.*$/)
             yaml.sub(/^translation_source_sha256:.*$/, line)
           else
             "#{yaml.rstrip}\n#{line}\n"
           end
    if match
      contents[match.begin(1)...match.end(1)] = yaml.rstrip
    else
      contents = yaml
    end
    recorded_contents[english_path] = contents
  elsif english['translation_source_sha256'] != digest
    failures << "Chinese source changed: translate #{chinese_path} into #{english_path}, then run ./bin/dev translations --record"
  end

  if chinese_path.end_with?('.yml')
    metadata_keys = %w[translation_source translation_source_sha256]
    chinese_keys = chinese.reject { |key, _| metadata_keys.include?(key) }
    english_keys = english.reject { |key, _| metadata_keys.include?(key) }
    inspect_keys = lambda do |value, prefix = ''|
      value.flat_map do |key, nested|
        path = "#{prefix}#{key}"
        nested.is_a?(Hash) ? inspect_keys.call(nested, "#{path}.") : [path]
      end.sort
    end
    if inspect_keys.call(chinese_keys) != inspect_keys.call(english_keys)
      failures << "UI translation keys differ: #{chinese_path} / #{english_path}"
    end
  end
end

unless failures.empty?
  warn failures.join("\n")
  exit 1
end
recorded_contents.each { |path, contents| File.write(path, contents) }
puts "#{pairs.length} Chinese/English pairs checked#{record ? '; synchronization fingerprints recorded' : ''}."
