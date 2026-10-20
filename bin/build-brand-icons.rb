#!/usr/bin/env ruby
# Optional icon export; ordinary Jekyll builds use the committed assets.
require 'fileutils'
require 'nokogiri'
require 'tmpdir'

root = File.expand_path('..', __dir__)
Dir.chdir(root)
abort 'Usage: ./bin/dev bundle exec ruby bin/build-brand-icons.rb' unless ARGV.empty?
directory = 'assets/img/brand'
source = File.join(directory, 'monogram.svg')
abort "Missing SVG master: #{source}" unless File.file?(source)

def convert!(*arguments)
  abort 'ImageMagick convert failed; run this helper inside bin/dev.' unless system('convert', *arguments)
end

Dir.mktmpdir('brand-icons-') do |temporary|
  # Read this mark's rect/circle/path geometry directly. The dev image has ImageMagick's
  # vector drawing engine but no rsvg-convert; exporting needs no new packages.
  svg = Nokogiri::XML(File.read(source)) { |config| config.strict.nonet }
  abort 'Keep the logo master on its 64×64 viewBox.' unless svg.root['viewBox'] == '0 0 64 64'
  drawing = ['scale 12,12', 'stroke none']
  svg.xpath('//*[local-name()="rect" or local-name()="circle" or local-name()="path"]').each do |shape|
    fill = shape['fill'] || shape.parent['fill']
    abort 'Each logo shape needs a solid hex fill.' unless fill&.match?(/\A#[0-9a-fA-F]{6}\z/)
    drawing << "fill '#{fill}'"
    if shape.name == 'rect'
      drawing << "roundrectangle 0,0 #{shape['width']},#{shape['height']} #{shape['rx']},#{shape['rx']}"
    elsif shape.name == 'circle'
      cx, cy, radius = %w[cx cy r].map { |attribute| Float(shape[attribute]) }
      drawing << "circle #{cx},#{cy} #{cx + radius},#{cy}"
    else
      drawing << "fill-rule #{shape['fill-rule'] || 'nonzero'}"
      drawing << "path '#{shape['d']}'"
    end
  end
  # Supersampling keeps the diagonal and curved edges clear at favicon sizes.
  master = File.join(temporary, 'master.png')
  convert!('-size', '768x768', 'xc:none', '-draw', drawing.join("\n"), '-strip', master)
  frames = [16, 32, 48].map do |size|
    path = File.join(temporary, "#{size}.png")
    convert!(master, '-resize', "#{size}x#{size}", '-depth', '8', '-strip', path)
    path
  end
  convert!(*frames, File.join(directory, 'favicon.ico'))
  FileUtils.cp(frames.last, File.join(directory, 'favicon-48.png'))
  # Preserve the circular mark on an opaque, lightly padded iOS icon tile.
  convert!(master, '-resize', '160x160', '-background', '#eceff4', '-gravity', 'center', '-extent', '180x180',
           '-alpha', 'remove', '-alpha', 'off', '-depth', '8', '-strip',
           File.join(directory, 'apple-touch-icon.png'))
end
puts 'Exported ZD icons: SVG master, ICO (16/32/48px), PNG (48px), Apple touch icon (180px).'
