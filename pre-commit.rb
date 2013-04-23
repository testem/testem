#! /usr/bin/env ruby

commands = [
  'grep -n describe.only -r tests/',
  'grep -n it.only -r tests/',
  'grep -n xdescribe -r tests/',
  'grep -n xit -r tests/',
  'grep -n debugger $(find . -name "*.js")',
  'grep -n "console.log(" $(find . -name "*.js")'
]


commands.each do |command|
  output = `#{command}`
  if output.size > 0 then
    puts "*** ABORT COMMIT ***"
    puts command
    puts "#{output}"
    exit 1
  end
end