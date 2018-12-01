for z in `find . -name "*.zip" -type f`;
  do unzip -n $z -d extracted;
done