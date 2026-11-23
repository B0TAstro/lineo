Pod::Spec.new do |s|
  s.name           = 'ClipFrames'
  s.version        = '0.1.0'
  s.summary        = 'Frames of a recorded clip, for the ball tracking in the replay.'
  s.description    = 'Decodes a time window of a video file into small upright RGB frames.'
  s.license        = 'UNLICENSED'
  s.author         = 'Temoin'
  s.homepage       = 'https://github.com/B0TAstro/temoin'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    # Pixel loops: optimised even in debug builds, or a frame takes ten times longer.
    'SWIFT_OPTIMIZATION_LEVEL' => '-O',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
