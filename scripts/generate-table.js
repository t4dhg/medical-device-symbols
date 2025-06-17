const fs = require("fs");
const path = require("path");

const iconsDir = "./src/icons";
const svgFiles = fs
  .readdirSync(iconsDir)
  .filter((file) => file.endsWith(".svg"))
  .sort();

console.log("## Available Icons\n");
console.log("| Component Name | Symbol | Title |");
console.log("| -------------- | ------ | ----- |");

svgFiles.forEach((file) => {
  const iconName = path.basename(file, ".svg");
  const componentName =
    iconName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("") + "Icon";

  const finalComponentName = /^\d/.test(componentName)
    ? "Icon" + componentName
    : componentName;

  const title = iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  console.log(
    `| \`${finalComponentName}\` | ![${iconName}](src/icons/${file}) | ${title} |`
  );
});
