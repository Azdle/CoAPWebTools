var Dump = (function() {
	"use strict"
	//
	// Constructor
	//

	function Dump(options) {
		this.options = {
			wordLength: options.wordLength || 8,
			wordsPerLine: options.wordsPerLine || 16,
			lineNumbers: options.lineNumbers || false,
			lineNumberDigits: options.lineNumberDigits || 8,
			lineNumberSeperator: options.lineNumberSeperator || ": ",
			asciiPreview: options.asciiPreview || false,
			asciiPreviewReplacer: options.asciiPreviewReplacer || ".",//"�",
			asciiPreviewSeperator: options.asciiPreviewSeperator || "  ",
			lineSeperator: options.lineSeperator || "\n",
			wordSeperator: options.wordSeperator || " ",
			wordPrepend: options.wordPrepend || "",
			wordAppend: options.wordAppend || ""
		};
	}

	//
	// Private Functions
	//
	
	function prepad(str, num, prepender) {
		while (str.length < num) {
			str = prepender.concat(str);
		}

		return str
	}

	function toPrintableAscii(code, replacer) {
		if (code >= 0x20 && code <= 0x7E) {
			return String.fromCharCode(code);
		} else {
			return replacer;
		}
	}

	//
	// Public Functions
	//

	Dump.prototype.dump = function(data) {
		var dumps = "";

		if (typeof(data) == "string") {
			data = new TextEncoder('utf-8').encode(data);
		} else if (typeof(data) === "object" && data.constructor === ArrayBuffer) {
			data = new Uint8Array(data);
		} else if (typeof(data) !== "object" || data.constructor !== Uint8Array) {
			console.error("Can only parse Uint8Array or String.");
			return null;
		}

		var asciiPreviewLine = "";
		for(var i in data){
			i = parseInt(i)
			if (this.options.lineNumbers == true && i % this.options.wordsPerLine == 0) {
				dumps = dumps + prepad(i.toString(16), this.options.lineNumberDigits, "0") + this.options.lineNumberSeperator;
			}

			asciiPreviewLine = asciiPreviewLine + toPrintableAscii(data[i], this.options.asciiPreviewReplacer);

			dumps = dumps + 
			        this.options.wordPrepend + 
			        prepad(data[i].toString(16), 2, "0") + 
			        this.options.wordAppend;

			if (((i+1) % this.options.wordsPerLine) === 0 || i === data.length-1) {
				if (i === data.length-1) {
					var wordsLeft = this.options.wordsPerLine - ((i+1) % this.options.wordsPerLine);
					var spacerLength = (this.options.wordPrepend.length +
					                    2 + //this.wordLength
					                    this.options.wordAppend.length +
					                    this.options.wordSeperator.length) * wordsLeft;

					var spacer = Array(spacerLength + 1).join(" ");
					dumps = dumps + spacer; 
					
				}

				if (this.options.asciiPreview === true) {
					dumps = dumps + this.options.asciiPreviewSeperator;
					dumps = dumps + asciiPreviewLine;
				}
				asciiPreviewLine = "";

				if (i !== data.length-1) {
					dumps = dumps + this.options.lineSeperator;
				}
			} else {
				dumps = dumps + this.options.wordSeperator;
			}
		}

		return dumps;
	}

	Dump.prototype.parse = function(slist) {
		var r = /(?:0x)?[0-9a-fA-F]{1,2}/g;

		var match;
		var i = 0
		while ((match = r.exec(slist)) != null) {
			i++;
		}
		var buf = new Uint8Array(i);
		i = 0
		while ((match = r.exec(slist)) != null) {
			buf[i++] = parseInt(match[0], 16);
		}

		return buf;
	}

	return Dump;
})()