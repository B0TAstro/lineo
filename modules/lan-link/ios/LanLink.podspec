Pod::Spec.new do |s|
  s.name           = 'LanLink'
  s.version        = '0.1.0'
  s.summary        = 'Text lines over TCP on the local network, between the phones of a session.'
  s.description    = 'A TCP listener and connections (Network.framework) carrying one line per message.'
  s.license        = 'UNLICENSED'
  s.author         = 'Lineo'
  s.homepage       = 'https://github.com/B0TAstro/lineo'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
