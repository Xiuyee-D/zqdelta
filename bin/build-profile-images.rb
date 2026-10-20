#!/usr/bin/env ruby
# Optional avatar-only derivatives; normal Jekyll builds use the committed files.
require 'digest'
require 'fileutils'
require 'json'
require 'pathname'
require 'tmpdir'

root = File.expand_path('..', __dir__)
Dir.chdir(root)
source = ARGV.fetch(0, 'assets/img/dzq.png')
abort 'Usage: ./bin/dev bundle exec ruby bin/build-profile-images.rb [assets/img/avatar.png]' if ARGV.length > 1
source = Pathname.new(source).cleanpath.to_s
abort 'Use an existing raster image under assets/img/.' unless source.start_with?('assets/img/') && File.file?(source) && source.match?(/\.(png|jpe?g)$/i)

manifest_path = '_data/profile_image.json'
previous = File.file?(manifest_path) ? JSON.parse(File.read(manifest_path)) : {}
stem = File.basename(source, File.extname(source))
directory = 'assets/img/profile'
FileUtils.mkdir_p(directory)
files = []
Dir.mktmpdir('profile-images-') do |temporary|
  [150, 225, 350, 525].each do |width|
    generated = File.join(temporary, "#{width}.webp")
    abort 'ImageMagick convert failed; run this helper inside bin/dev.' unless system('convert', source, '-auto-orient', '-resize', "#{width}>", '-strip', '-quality', '82', generated)
    hash = Digest::SHA256.file(generated).hexdigest[0, 12]
    path = "#{directory}/#{stem}-#{width}-#{hash}.webp"
    FileUtils.cp(generated, path)
    files << { 'path' => "/#{path}", 'width' => width, 'bytes' => File.size(path) }
  end
end
manifest = {
  'source' => "/#{source}",
  'source_sha256' => Digest::SHA256.file(source).hexdigest,
  'sizes' => '(min-width: 925px) 175px, 75px',
  'files' => files
}
File.write(manifest_path, JSON.pretty_generate(manifest) + "\n")
previous.fetch('files', []).each do |file|
  path = file.fetch('path').delete_prefix('/')
  next unless path.start_with?("#{directory}/") && File.basename(path).match?(/-\d+-[a-f0-9]{12}\.webp$/)
  File.delete(path) if File.file?(path) && files.none? { |current| current['path'] == "/#{path}" }
end
puts "Avatar derivatives: #{files.map { |file| "#{file['width']}px #{file['bytes']} bytes" }.join(', ')}"
