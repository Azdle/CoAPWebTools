// might need polyfill https://github.com/inexorabletash/text-encoding


var Coap = (function() {
	"use strict"
	//
	// Constructor
	//

	function Coap(options) {
		options = options || {};

		this.options = {
			useDeafults: options.useDefaults || true, //dummy
		};
	}

	//
	// Private Functions
	//

	 function invert(obj) {
		var result = {};
		for (var x in obj) {
			result[obj[x]] = x;
		}
		return result;
	};
	
	function randomInt(min, max) {
	  return Math.floor(Math.random() * (max - min)) + min;
	}

	function Utf8ArrayToStr(array) {
			var out, i, len, c;
			var char2, char3;

			out = "";
			len = array.length;
			i = 0;
			while(i < len) {
				c = array[i++];
				switch (c >> 4) { 
					case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
						// 0xxxxxxx
						out += String.fromCharCode(c);
						break;
					case 12: case 13:
						// 110x xxxx   10xx xxxx
						char2 = array[i++];
						out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
						break;
					case 14:
						// 1110 xxxx  10xx xxxx  10xx xxxx
						char2 = array[i++];
						char3 = array[i++];
						out += String.fromCharCode(((c & 0x0F) << 12) |
						                           ((char2 & 0x3F) << 6) |
						                           ((char3 & 0x3F) << 0));
						break;
					default:
						return "<parse error>";
				}
			}

			return out;
	}

	function makeStringOptParser(minLen, maxLen) {
		var decoder = new TextDecoder('utf-8');
		return function(value) {
			if (value.length < minLen || value.length > maxLen) {
				console.error("Option Value Outside Allowable Length");
				return null;
			}

			return decoder.decode(value);
		}
	}

	function makeUintOptParser(minLen, maxLen) {
		return function(value) {
			if (value.length < minLen || value.length > maxLen) {
				console.error("Option Value Outside Allowable Length");
				return null;
			}

			var uint_value = 0;
			for (var i = value.length - 1; i >= 0; i--) {
				uint_value |= (value[i] << (i*8))
			};

			return uint_value;
		}
	}

	function contentFormatParser(value) {
		
	}

	function contentFormatIParser(value) {
		
	}

	function makeStringOptDumper(minLen, maxLen) {
		var encoder = new TextEncoder('utf-8');
		return function(value, exisitng) {
			if (typeof(value) !== "string") {
				throw new Error("Value of String-Type Option Must be String")
			}

			if (value.length < minLen || value.length > maxLen) {
				console.error("Option Value Outside Allowable Length");
				return null;
			}

			return encoder.encode(value);
		}
	}

	function makeUintOptDumper(minLen, maxLen) {
		return function(value, existing) {
			if (typeof(value) !== "number") {
				throw new Error("Value of Uint-Type Option Must be Number")
			}

			var encLen = Math.ceil(Math.log2(value+1)/8)

			if (encLen < minLen || encLen > maxLen) {
				console.error("Value of Uint-Type Option Outside Allowable Range");
				return null;
			}

			var encoded_value = new Uint8Array(encLen);
			for (var i = encLen - 1; i >= 0; i--) {
				encoded_value[i] = (value >> (i*8)) & 0xFF;
			};

			return encoded_value;
		}
	}

	//
	// Defined Values
	//
	Coap.prototype.types = {
		CON: 0,
		NON: 1,
		ACK: 2,
		RST: 3,
	}

	Coap.prototype.itypes = invert(Coap.prototype.types)

	Coap.prototype.codes = {
		EMPTY: 0, // 0.00
		GET : 1, // 0.01
		POST: 2, // 0.02
		PUT: 3, // 0.03
		DELETE: 4, // 0.04
		Created: 65, // 2.01
		Deleted: 66, // 2.02
		Valid: 67, // 2.03
		Changed: 68, // 2.04
		Content: 69, // 2.05
		Continue: 95, // 2.31
		BadRequest: 128, // 4.00
		Unauthorized: 129, // 4.01
		BadOption: 130, // 4.02
		Forbidden: 131, // 4.03
		NotFound: 132, // 4.04
		MethodNotAllowed: 133, // 4.05
		NotAcceptable: 134, // 4.06
		RequestEntityIncomplete: 146, // 4.08
		PreconditionFailed: 140, // 4.12
		RequestEntityTooLarge: 141, // 4.13
		UnsupportedContentFormat: 143, // 4.15
		InternalServerError: 160, // 5.00
		NotImplemented: 161, // 5.01
		BadGateway: 162, // 5.02
		ServiceUnavailable: 163, // 5.03
		GatewayTimeout: 164, // 5.04
		ProxyingNotSupported: 165, // 5.05
	}

	Coap.prototype.icodes = invert(Coap.prototype.codes)

	Coap.prototype.opt = {
		IfMatch: {
			num: 1,
			isRepeatable: false
		},
		UriHost: {
			num: 3,
			parser: makeStringOptParser(1,255),
			dumper: makeStringOptDumper(1,255),
			isRepeatable: false
		},
		ETag: {
			num: 4,
			isRepeatable: false
		},
		IfNoneMatch: {
			num: 5,
			parser: makeUintOptParser(0,0),
			dumper: makeUintOptDumper(0,0),
			isRepeatable: false
		},
		Observe: {
			num: 6,
			parser: makeUintOptParser(0,3),
			dumper: makeUintOptDumper(0,3),
			isRepeatable: false
		},
		UriPort: {
			num: 7,
			parser: makeUintOptParser(0,2),
			dumper: makeUintOptDumper(0,2),
			isRepeatable: false
		},
		LocationPath: {
			num: 8,
			parser: makeStringOptParser(0,255),
			dumper: makeStringOptDumper(0,255),
			isRepeatable: true
		},
		UriPath: {
			num: 11,
			parser: makeStringOptParser(0,255),
			dumper: makeStringOptDumper(0,255),
			isRepeatable: true
		},
		ContentFormat: {
			num: 12,
			parser: makeUintOptParser(0,2),
			dumper: makeUintOptDumper(0,2),
			isRepeatable: false
		},
		MaxAge: {
			num: 14,
			parser: makeUintOptParser(0,4),
			dumper: makeUintOptDumper(0,4),
			isRepeatable: false,
			defaultValue: 60
		},
		UriQuery: {
			num: 15,
			parser: makeStringOptParser(0,255),
			dumper: makeStringOptDumper(0,255),
			isRepeatable: true
		},
		Accept: {
			num: 17,
			parser: makeUintOptParser(0,2),
			dumper: makeUintOptDumper(0,2),
			isRepeatable: false
		},
		LocationQuery: {
			num: 20,
			parser: makeStringOptParser(0,255),
			dumper: makeStringOptDumper(0,255),
			isRepeatable: true
		},
		Block2: {
			num: 23,
			parser: makeUintOptParser(0,4),
			dumper: makeUintOptDumper(0,4),
			isRepeatable: false
		},
		Block1: {
			num: 27,
			parser: makeUintOptParser(0,4),
			dumper: makeUintOptDumper(0,4),
			isRepeatable: false
		},
		Size2: {
			num: 28,
			parser: makeUintOptParser(0,4),
			dumper: makeUintOptDumper(0,4),
			isRepeatable: false
		},
		ProxyUri: {
			num: 35,
			parser: makeStringOptParser(0,255),
			dumper: makeStringOptDumper(0,255),
			isRepeatable: false
		},
		ProxyScheme: {
			num: 39,
			parser: makeStringOptParser(0,255),
			dumper: makeStringOptDumper(0,255),
			isRepeatable: false
		},
		Size1: {
			num: 60,
			parser: makeUintOptParser(0,4),
			dumper: makeUintOptDumper(0,4),
			isRepeatable: false
		}
	}

	Coap.prototype.ioptnums = {};
	Object.keys(Coap.prototype.opt)
		.map(function (key) {
			return Coap.prototype.ioptnums[Coap.prototype.opt[key].num] = key;
		});

	//
	// Public Functions
	//

	Coap.prototype.parse = function(pkt) {
		var msg = {};

		if (typeof(pkt) === "object" && pkt.constructor === ArrayBuffer) {
			pkt = new Uint8Array(pkt);
		}

		if (typeof(pkt) !== "object" || pkt.constructor !== Uint8Array) {
			throw new Error("Can Only Parse Uint8Array");
		}

		if (pkt[0] >> 6 == 1) {
			msg.version = 1;
		} else {
			throw new Error("CoAP Version Must be 1");
		}

		// Type
		msg.type = this.itypes[(pkt[0] >> 4) & 0x03];

		// Code
		msg.code = pkt[1];
		if (this.icodes[msg.code] !== undefined) {
			msg.code = this.icodes[msg.code];
		}

		// Message ID
		msg.mid = (pkt[2] << 8) | pkt[3];

		// Token
		var tkl = pkt[0] & 0x0F;
		if (tkl > 8) {
			throw new Error("Bad Token Length");
		}

		msg.token = new Uint8Array(pkt.buffer, pkt.byteOffset + 4, tkl);

		// create view to option bytes
		var opt_bytes = new Uint8Array(pkt.buffer, pkt.byteOffset + 4 + tkl, pkt.length - (4 + tkl));
		var last_opt_num = 0;

		msg.opts = {}

		while (opt_bytes.length != 0) {
			// check for payload marker
			if (opt_bytes[0] == 0xFF){
				var array_payload = new Uint8Array(opt_bytes.buffer, opt_bytes.byteOffset + 1, opt_bytes.length - (1));
				// Old Method
				//var text_payload = Utf8ArrayToStr(array_payload)
				var text_payload = new TextDecoder('utf-8').decode(array_payload)

				if (text_payload !== "<parse error>"){
					msg.payload = text_payload;
				} else {
					msg.payload = array_payload;
				}
				break;
			}

			var opt_num = opt_bytes[0] >> 4;
			var opt_len = opt_bytes[0] & 0x0F;
			var offset = 0;

			if (opt_num == 13) {
				opt_num = opt_bytes[1] + 13;
				offset += 1;
			} else if (opt_num == 14) {
				opt_num = (opt_bytes[1] << 8) | opt_bytes[2] + 269;
				offset += 2;
			} else if (opt_num == 15) {
				throw new Error("Invalid Option Delta: 15");
			}

			if (opt_len == 13) {
				opt_len = opt_bytes[1 + offset] + 13;
				offset += 1;
			} else if (opt_len == 14) {
				opt_len = (opt_bytes[1 + offset] << 8) | opt_bytes[2 + offset] + 269;
				offset += 2;
			} else if (opt_len == 15) {
				throw new Error("Invalid Option Length: 15");
			}

			opt_num += last_opt_num;
			last_opt_num = opt_num;

			var opt_name = opt_num;
			if (this.ioptnums[opt_num] !== undefined) {
				opt_name = this.ioptnums[opt_num];
			}

			if (msg.opts[opt_name] == undefined) {
				msg.opts[opt_name] = [];
			}

			var opt_view = new Uint8Array(opt_bytes.buffer, opt_bytes.byteOffset + offset+1, opt_len);
			if (this.opt[opt_name].parser !== undefined){
				msg.opts[opt_name].push(this.opt[opt_name].parser(opt_view));
			} else {
				msg.opts[opt_name].push(opt_view);
			}

			opt_bytes = new Uint8Array(opt_bytes.buffer, opt_bytes.byteOffset + 1 + offset + opt_len, opt_bytes.length - (1 + offset + opt_len));

			if (opt_bytes.length == 0) {
				break;
			}
		}

		// flatten options where possible
		for (var i in msg.opts) {
			if (this.opt[i].isRepeatable != true && msg.opts[i].length > 1) {
				throw new Error("Non-Repeatable Option "+i+" Occurs More than Once");
			} else if (msg.opts[i].length == 1) {
				msg.opts[i] = msg.opts[i][0];
			}
		};

		return msg;
	}

	Coap.prototype.dump = function(msg) {
		var buf = new ArrayBuffer(1500);
		var pkt = new Uint8Array(buf);

		if (typeof(msg) !== "object") {
			throw new Error("Message Must be an Object");
		}

		if (msg.version == 1 || msg.version == undefined) {
			pkt[0] = 1 << 6;
		} else {
			throw new Error("CoAP Version Must be 1");
		}

		// Type
		if (this.types[msg.type] !== undefined) {
			pkt[0] |= (this.types[msg.type] << 4);
		} else {
			throw new Error("Unknown Type: "+msg.type);
		}

		// Code
		if (this.codes[msg.code] !== undefined) {
			pkt[1] = this.codes[msg.code];
		} else if (typeof(msg.code) === "number") {
			pkt[1] = msg.code & 0xFF;
		} else {
			throw new Error("Unknown Code: "+msg.code);
		}

		// Message ID
		if (msg.mid == undefined) msg.mid = randomInt(0,65535);
		pkt[2] = msg.mid >> 8;
		pkt[3] = msg.mid & 0xFF;

		// Token
		var tkl = 0;
		if (typeof(msg.token) === "object" && msg.token.length > 0) {
			if (msg.token.length > 8) {
				throw new Error("Bad Token Length");
			}

			pkt[0] |= msg.token.length;
			for(var i = 0; i < msg.token.length; i++){
				pkt[i+4] = msg.token[i];
			}

			tkl = msg.token.length;
		}

		var index = 4 + tkl;
		if (typeof(msg.opts) === "object") {
			// Transform Option Names to Numbers
			for(var key in msg.opts) {
				if (this.opt[key].num !== undefined) {
					msg.opts[this.opt[key].num] = msg.opts[key];
					delete msg.opts[key];
				} else if (isNaN(parseInt(key))) {
					throw new Error("Unknown Option: "+key);
				}
			}

			// gets keys as ints
			var optkeys = Object.keys(msg.opts).map(function(x) { return parseInt(x); });
			optkeys.sort(function(a, b) { return a - b; });

			var last_opt_num = 0;
			for(var i in optkeys){
				var key = optkeys[i];
				var opt_name = this.ioptnums[key];
				if (msg.opts[key] instanceof Array && msg.opts[key].length > 1 && this.opt[opt_name].isRepeatable == false) {
					throw new Error("Non-Repeatable Option "+opt_name+" Occurs More than Once");
				} else if (!(msg.opts[key] instanceof Array)) {
					msg.opts[key] = [msg.opts[key]]
				};
				for(var j in msg.opts[key]){
					var opt = msg.opts[key][j];
					if (opt_name != undefined && this.opt[opt_name].dumper !== undefined){
						opt = this.opt[opt_name].dumper(opt);
					} else if (typeof(opt) == "string") {
						opt = new TextEncoder('utf-8').encode(opt);
					} else if (typeof(opt) === "object" && opt.constructor === ArrayBuffer) {
						opt = new Uint8Array(opt);
					} else if (typeof(opt) !== "object" || opt.constructor !== Uint8Array) {
						throw new Error("Option Value Must be Uint8Array or String");
					}

					var num = parseInt(key) - last_opt_num;
					var offset = 0;

					if (num < 13) {
						pkt[index++] = num << 4;
						offset += 1;
					} else if (num < 269) {
						pkt[index++] = 13 << 4;
						pkt[index++] = num - 13;
						offset += 2;
					} else if (num < 65535) {
						pkt[index++] = 14 << 4;
						pkt[index++] = (num - 269) >> 8;
						pkt[index++] = (num - 269) && 0xFF;
						offset += 3;
					} else {
						throw new Error("Invalid Option Number: "+num);
					}

					if (opt.length < 13) {
						pkt[index-offset] |= opt.length;
					} else if (opt.length < 269) {
						pkt[index-offset] |= 13;
						pkt[index++] = opt.length - 13;
					} else if (opt.length > 65535) {
						pkt[index-offset] |= 14;
						pkt[index++] = (opt.length - 269) >> 8;
						pkt[index++] = (opt.length - 269) && 0xFF;
					} else {
						throw new Error("Invalid Option Length: "+opt.length);
					}

					// Copy Option Value
					var value_offset = index;
					for (var i = opt.length - 1; i >= 0; i--) {
						pkt[i+value_offset] = opt[i];
					};
					index += opt.length;
					
					last_opt_num = parseInt(key);
				}

			}
		}

		if (msg.payload !== undefined && msg.payload !== null) {
			pkt[index++] = 0xFF; //add payload marker

			var payload_offset = index;

			if (typeof(msg.payload) == "string") {
				msg.payload = new TextEncoder('utf-8').encode(msg.payload);
			} else if (typeof(msg.payload) === "object" && msg.payload.constructor === ArrayBuffer) {
				msg.payload = new Uint8Array(msg.payload);
			} else if (typeof(msg.payload) !== "object" || msg.payload.constructor !== Uint8Array) {
				throw new Error("Payload Must be Uint8Array or String");
			}

			var payload_offset = index;
			for (var i = msg.payload.length - 1; i >= 0; i--) {
				pkt[i+payload_offset] = msg.payload[i];
			};
			index += msg.payload.length;
		}

		return new Uint8Array(buf, 0, index);
	}

	return Coap;
})()