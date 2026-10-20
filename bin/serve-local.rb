#!/usr/bin/env ruby
require 'jekyll'
require 'yaml'

# Jekyll serve replaces site.url with its bind address in development. Docker
# must bind 0.0.0.0, while browser-facing links should use the local config URL.
local_config = File.expand_path('../_config.local.yml', __dir__)
preview_url = YAML.safe_load_file(local_config).fetch('url')
Jekyll::Hooks.register(:site, :after_reset) do |site|
  site.config['url'] = preview_url
end

load Gem.bin_path('jekyll', 'jekyll')
