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

	function makeStringOptHandler(minLen, maxLen, def) {
		var decoder = new TextDecoder('utf-8');
		return function(value) {
			if (value.length < minLen || value.length > maxLen) {
				console.error("Option Value Outside Allowable Length");
				return null;
			}

			return decoder.decode(value);
		}
	}

	function makeUintOptHandler(minLen, maxLen, def) {
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

	Coap.prototype.optnums = {
		IfMatch: 1,
		UriHost: 3,
		ETag: 4,
		IfNoneMatch: 5,
		Observe: 6,
		UriPort: 7,
		LocationPath: 8,
		UriPath: 11,
		ContentFormat: 12,
		MaxAge: 14,
		UriQuery: 15,
		Accept: 17,
		LocationQuery: 20,
		Block2: 23,
		Block1: 27,
		Size2: 28,
		ProxyUri: 35,
		ProxyScheme: 39,
		Size1: 60,
	}

	Coap.prototype.ioptnums = invert(Coap.prototype.optnums)

	Coap.prototype.optparser = {
		//IfMatch: 1,
		UriHost: makeStringOptHandler(1,255), //note default is ip literal of dest server, unsupported
		//ETag: 4,
		IfNoneMatch: makeUintOptHandler(0,0), //must be empty
		Observe: makeUintOptHandler(0,3),
		UriPort: makeUintOptHandler(0,2),
		LocationPath: makeStringOptHandler(0,255),
		UriPath: makeStringOptHandler(0,255),
		ContentFormat: makeUintOptHandler(0,2),
		MaxAge: makeUintOptHandler(0,4,60),
		UriQuery: makeStringOptHandler(0,255),
		Accept: makeUintOptHandler(0,2),
		LocationQuery: makeStringOptHandler(0,255),
		Block2: makeUintOptHandler(0,4),
		Block1: makeUintOptHandler(0,4),
		Size2: makeUintOptHandler(0,4),
		ProxyUri: makeStringOptHandler(0,255),
		ProxyScheme: makeStringOptHandler(0,255),
		Size1: makeUintOptHandler(0,4),
	}

	//Coap.prototype.ioptparser = invert(Coap.prototype.optnums)

	//
	// Public Functions
	//

	Coap.prototype.parse = function(pkt) {
		var msg = {};

		if (typeof(pkt) === "object" && pkt.constructor === ArrayBuffer) {
			pkt = new Uint8Array(pkt);
		}

		if (typeof(pkt) !== "object" || pkt.constructor !== Uint8Array) {
			console.error("Can only parse Uint8Array.");
			return null;
		}

		if (pkt[0] >> 6 == 1) {
			msg.version = 1;
		} else {
			console.error("CoAP Version Must be 1");
			return null;
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
			console.error("Bad Token Length");
			return null;
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
				console.error("Invalid Option Delta: 15");
				return null;
			}

			if (opt_len == 13) {
				opt_len = opt_bytes[1 + offset] + 13;
				offset += 1;
			} else if (opt_len == 14) {
				opt_len = (opt_bytes[1 + offset] << 8) | opt_bytes[2 + offset] + 269;
				offset += 2;
			} else if (opt_len == 15) {
				console.error("Invalid Option Length: 15");
				return null;
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
			if (this.optparser[opt_name] !== undefined){
				msg.opts[opt_name].push(this.optparser[opt_name](opt_view));
			} else {
				msg.opts[opt_name].push(opt_view);
			}

			opt_bytes = new Uint8Array(opt_bytes.buffer, opt_bytes.byteOffset + 1 + offset + opt_len, opt_bytes.length - (1 + offset + opt_len));

			if (opt_bytes.length == 0) {
				break;
			}
		}

		return msg;
	}

	Coap.prototype.dump = function(msg) {
		var buf = new ArrayBuffer(1500);
		var pkt = new Uint8Array(buf);

		if (typeof(msg) !== "object") {
			console.error("Can only parse Uint8Array.");
			return null;
		}

		if (msg.version == 1 || msg.version == undefined) {
			pkt[0] = 1 << 6;
		} else {
			console.error("CoAP Version Must be 1");
			return null;
		}

		// Type
		if (this.types[msg.type] !== undefined) {
			pkt[0] |= (msg.type << 4);
		} else {
			console.error("Unknown Type: "+msg.type);
			return null;
		}

		// Code
		if (this.codes[msg.code] !== undefined) {
			pkt[1] = this.codes[msg.code];
		} else if (typeof(msg.code) === "number") {
			pkt[1] = msg.code & 0xFF;
		} else {
			console.error("Unknown Code: "+msg.code);
			return null;
		}

		// Message ID
		if (msg.mid == undefined) msg.mid = randomInt(0,65535);
		pkt[2] = msg.mid >> 8;
		pkt[3] = msg.mid & 0xFF;

		// Token
		var tkl = 0;
		if (typeof(msg.token) === "object" && msg.token.length > 0) {
			if (msg.token.length > 8) {
				console.error("Bad Token Length");
				return null;
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
				if (this.optnums[key] !== undefined) {
					msg.opts[this.optnums[key]] = msg.opts[key];
					delete msg.opts[key];
				} else if (isNaN(parseInt(key))) {
					console.error("Unknown Option: "+key);
				}
			}

			// gets keys as ints
			var optkeys = Object.keys(msg.opts).map(function(x) { return parseInt(x); });
			optkeys.sort(function(a, b) { return a - b; });

			var last_opt_num = 0;
			for(var i in optkeys){
				var key = optkeys[i];
				for(var j in msg.opts[key]){
					var opt = msg.opts[key][j];
					if (typeof(opt) == "string") {
						opt = new TextEncoder('utf-8').encode(opt);
					} else if (typeof(opt) === "object" && opt.constructor === ArrayBuffer) {
						opt = new Uint8Array(opt);
					} else if (typeof(opt) !== "object" || opt.constructor !== Uint8Array) {
						console.error("Can only parse Uint8Array or String.");
						return null;
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
						console.error("Invalid Option Number: "+num);
						return null;
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
						console.error("Invalid Option Length: "+opt.length);
						return null;
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
				console.error("Can only parse Uint8Array or String.");
				return null;
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