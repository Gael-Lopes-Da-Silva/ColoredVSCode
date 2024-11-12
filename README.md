<div align="center">
	<h1>Colored</h1>
</div>

<div align="center">
	<img width="400px" src="./resources/logo.png" alt="">
</div>

<div align="center">
    <a href="https://github.com/Gael-Lopes-Da-Silva/ColoredVSCode">https://github.com/Gael-Lopes-Da-Silva/ColoredVSCode</a>
</div>

<br>

<div align="center">
	<img src="https://img.shields.io/visual-studio-marketplace/r/gael-lopes-da-silva.colored?style=for-the-badge&labelColor=000000" alt="">
	<img src="https://img.shields.io/visual-studio-marketplace/i/gael-lopes-da-silva.colored?style=for-the-badge&labelColor=000000" alt="">
	<img src="https://img.shields.io/visual-studio-marketplace/d/gael-lopes-da-silva.colored?style=for-the-badge&labelColor=000000" alt="">
</div>

<div align="center">
	<a href="./LICENSE.md">
		<img src="https://img.shields.io/badge/license-BSD%203--Clause-blue?style=for-the-badge&labelColor=000000" alt="">
	</a>
</div>


Description
------------------------------------------------------------------

Colored is a simple extension that highlight colors in hexadecimal and rgb value. It also support alpha channel for transparency.


Supported color formats
------------------------------------------------------------------

Right now we support the following color formats.
- hexadecimal
- rgb - rgba
- hsl - hsla
- lch
- hwb
- lab

If you want to learn more a web color in general, see [here](https://en.wikipedia.org/wiki/Web_colors).


Options
------------------------------------------------------------------

Colored has 1 command available right now. `Colored: Toggle Hightlight` that turn on or off colors highlighting.

~~~json
{
	"colored.borderRadius": 3, // Raduis of the colors background
	"colored.highlight": true, // Enable or disable highlight of colors
    "colored.maxFileSize": 1000000, // The maximum file size to work with (1mb)
    "colored.maxLineCount": 10000, // The maximum number of line to work with
}
~~~


Screenshots
------------------------------------------------------------------

![](./screenshots/colored_1.png)


How to build
------------------------------------------------------------------

If you want a build of Colored you can find it in the release section or in the [build](./build/) folder. Else use `vsce package` in the project folder.


How to install
------------------------------------------------------------------

To install, open visual studio code and go to the extention menu. Click on the three dots and click on `Install from VSIX` and choose the `colored-X.X.X.vsix` file. Or just install it on the market place.