./testem.js launchers
cd examples
for dir in $(ls)
do
  if [ $dir == "browserstack" ]
  then
    continue
  fi
  if [ $dir == "saucelabs" ]
  then
    continue
  fi
	echo "Testing $dir..."
  cd $dir
	../../testem.js ci -P 10 | pcregrep -M "# tests ([0-9]+)\n# (pass|fail)  ([0-9]+)"
	cd ..
done
cd ..