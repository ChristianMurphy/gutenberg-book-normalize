for z in `find . -name "*.zip" -type f`;
  do unzip $z -d extracted;
done