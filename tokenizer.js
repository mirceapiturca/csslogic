'use strict';

/**
 *	tokenizer.js
 *	Author: Mircea Piturca. @mirceadesign
 *
 */
 

var Tokenizer = function _Tokenizer(aStream, Options) {

	this.stream =		aStream;
	this.tokens			= [];
	this.hasWhitespace	= [];
	this.idx			= 0;
	this.code			= 0;
	this.codePoints		= [];
	
	if (Options) {
		
		if (Options.mode === 'Parse Style Rule') {
			
			this.i				= Options.start;
			this.line			= Options.line;
			this.tokenizeRule	= true;
		}
		
	} else {
		
		this.i		= 0;
		this.line	= 1;
	}
	
	this.tokenize();

	return this.tokens;
}

Tokenizer.prototype = {

	consume: function _consume(x) {
		
		this.i += x;
		this.code = this.stream.charCodeAt(this.i);
		
		if (!isNaN(this.code)) {
			this.codePoints.push(this.code);
		}
	},
	
	
	reconsume: function _reconsume(x) {
		
		//	isNewLine
		if (this.code === 0xa || this.code === 0xc) {
			this.line -= 1;
		}
		
		this.codePoints.pop();
		this.i -= x;
		this.code = this.stream.charCodeAt(this.i);
	},
	
	
	next: function _next(x) {
		return this.stream.charCodeAt(this.i + x);
	},
	
	
	isNewline: function _isNewline(aCode) {
		
		//	U+000A LINE FEED

		if (aCode === 0xa) {
			
			this.line += 1;
			return true;
			
		} else {
			
			return false;
		}
	},
	

	isWhitespace: function _isWhitespace(aCode) {
		
		//	A newline, U+0020 SPACE or  U+0009 CHARACTER TABULATION.
		return this.isNewline(aCode) || aCode == 0x20 || aCode == 9; 
	//	return aCode === 32 || aCode === 9 || aCode === 13 || aCode === 10 || aCode === 12;
	},
	
	
	isBetween: function _isBetween(aNumber, aFirst, aLast) {
		return aNumber >= aFirst && aNumber <= aLast;
	},
	
	
	isDigit: function _isDigit(aCode) {
		return aCode > 47 && aCode < 58;
	},
	
	
	isHexdigit: function _isHexdigit(aCode) {
		return this.isDigit(aCode) || this.isBetween(aCode, 0x41, 0x46) || this.isBetween(aCode, 0x61, 0x66);
	},
	
	
	isNamechar: function _isNamechar(aCode) {
		return aCode >= 0x61 && aCode <= 0x7a || aCode >= 0x41 && aCode <= 0x5a || aCode >= 0x30 && aCode <= 0x39 || aCode === 0x2d || aCode === 0x5f || aCode >= 0xa0;
	},
	
	
	isNamestartchar: function _isNamestartcharr(aCode) {
		return aCode >= 0x61 && aCode <= 0x7a || aCode >= 0x41 && aCode <= 0x5a || aCode === 0x5f || aCode >= 0xa0;
	},
	
	
	isNonprintable: function _isNonprintable(aCode) {
		return this.isBetween(aCode, 0,8) || this.isBetween(aCode, 0xe,0x1f) || this.isBetween(aCode, 0x7f,0x9f);
	},
	
	
	emitToken: function _emitToken(aType, aValue) {

		this.tokens.push({
			type		: aType,
			value		: aValue,
			idx			: this.idx,
			line		: this.line,
			codePoints	: this.codePoints
		});
		
	//	this.codePointsToString(this.codePoints);
		this.idx += 1;
		this.codePoints = [];
	},
	
	
	emitWhitespaceToken: function _emitWhitespaceToken() {

		this.tokens.push({
			type		: 'WHITESPACE',
			value		: this.hasWhitespace,
			idx			: this.idx,
			line		: this.line,
			codePoints	: this.hasWhitespace
		});
		
		this.idx += 1;
		
		this.hasWhitespace = [];
		this.codePoints = [];
	},
	
	
	emitHashToken: function _emitHashToken(aType, aValue, isId) {
		
		this.tokens.push({
			type		: 'HASH',
			value		: aValue,
			id			: isId,
			idx			: this.idx,
			line		: this.line,
			codePoints	: this.codePoints
		});
		
		this.idx += 1;
		this.codePoints = [];
	},
	
	
	emitCurlyToken: function _emitCurlyToken(aType, aValue) {

		this.tokens.push({
			type		: aType,
			value		: aValue,
			idx			: this.idx,
			line		: this.line,
			codePoints	: this.codePoints
		});

		this.idx += 1;
		this.codePoints = [];
		
		if (this.tokenizeRule) {
			
			//	Exit tokenizer on first <}>
			this.i = this.stream.length
			return this.tokens;
		}
	},	
	
	emitTokenEOF: function _emitTokenEOF(aType, aValue) {

		this.tokens.push({
			type		: aType,
			value		: aValue,
			idx			: this.idx,
			line		: this.line,
			codePoints	: []
		});
		
		this.idx += 1;
		this.codePoints = [];
	},
	
	codePointsToString: function _codePointsToString(aCodePointList) {
		
		var i = 0,
			il = aCodePointList.length,
			str = '',
			codePoint;
			
		for (; i < il; i += 1) {
			codePoint = aCodePointList[i];
			str += String.fromCharCode(codePoint)
		}
	},
	
	
	startsWithValidEscape: function _startsWithValidEscape(aFirst, aSecond) {
		
		/**
		 *	4.3.8 Check if two code points are a valid escape
		 *	http://dev.w3.org/csswg/css-syntax/#check-if-two-code-points-are-a-valid-escape
		 */
		 
		 if (aFirst !== 92){
			 
			//	If the first character is not U+005D REVERSE SOLIDUS (\), return false.
			 return false;
			 
		} else if (this.isNewline(aSecond)){
			
			//	Otherwise, if the second character is a newline, return false.
			this.line -= 1;
			return false;
			
		} else {

			//	Otherwise, return true.
			return true;
		}
	},
	
	
	startsIdentifier: function _startsIdentifier(aFirst, aSecond, aThird) {

		/**
		 *	4.3.9. Check if three characters would start an identifier
		 *	http://dev.w3.org/csswg/css-syntax/#check-if-three-characters-would-start-an0
		 */

		if (aFirst === 0x2D) {

			//	U+002D HYPHEN-MINUS
			
			if (this.isNamestartchar(aSecond) || this.startsWithValidEscape(aSecond, aThird)) {

				//	If the second character is a name-start character,
				//	or the second and third characters are a valid escape, return true
				
				return true;
				
			} else {
				return false;
			}
			
		} else if (this.isNamestartchar(aFirst)){
			
			//	name-start character
			
			return true;
			
		} else if (aFirst === 0x5C) {
			
			//	U+005C REVERSE SOLIDUS (\)
			
			if (this.startsWithValidEscape(aFirst, aSecond)){
				
				//	If the first and second characters are a valid escape, return true.
				return true;
				
			} else {
				return false;
			}
		}
	},
	
	
	startsNumber: function _startsNumber(aFirst, aSecond, aThird) {

		/**
		 *	4.3.10. Check if three characters would start a number
		 *	http://dev.w3.org/csswg/css-syntax/#check-if-three-characters-would-start-a-0
		 */

		if (aFirst === 0x2B || aFirst === 0x2D) {

			//	U+002B PLUS SIGN (+)
			//	or U+002D HYPHEN-MINUS (-)

			if (this.isDigit(aSecond)) {

				//	If the second character is a digit, return true.
				return true;

			} else if (aSecond === 0x2E && this.isDigit(aThird)) {

				//	Otherwise, if the second character is a U+002E FULL STOP (.)
				//	&& the third character is a digit,
				return true;

			} else {
				return false;
			}

		} else if (aFirst === 0x2E) {

			//	U+002E FULL STOP (.)

			if (this.isDigit(aSecond)) {

				//	If the second character is a digit, return true.
				return true;

			} else {
				return false;
			}

		} else if (this.isDigit(aFirst)) {

			//	digit
			return true;

		} else {
			return false;
		}
	},
	
	
	consumeWhitespace: function _consumeWhitespace() {

		var whitespace	= [],
			stream		= this.stream,
			i			= this.i,
			wscode		= stream.charCodeAt(i);

	//	while (wscode == 32 || wscode == 9 || wscode == 13 || wscode == 10 || wscode == 12) {
		while (this.isWhitespace(wscode)) {

			whitespace.push(wscode);
			i += 1;
			wscode = stream.charCodeAt(i);
		}

		if (whitespace.length) {

			this.consume(whitespace.length - 1);
			this.hasWhitespace = whitespace;
			return true;

		} else {
			return false;
		}
	},
	
	
	consumeEscape: function _consumeEscape() {
		
		/**
		 *	4.3.7. Consume an escaped character
		 *	http://dev.w3.org/csswg/css-syntax/#consume-an-escaped-character0
		 */

		var n = 0,
			nl = 6,
			hex = '',
			code,
			codePoint,
			current
			
		for (; n < nl; n += 1) {
			
			code = this.stream.charCodeAt(this.i + n);
			
			if (this.isHexdigit(code)){
				
				//	Consume as many hex digits as possible, but no more than 5
				hex += String.fromCharCode(code);
				
			} else if (this.isWhitespace(code)){
				
				//	If the next input character is whitespace, consume it as well.
				this.consume(1);
				break;
				
			} else if (isNaN(code)) {

				//	EOF character
				//	Return U+FFFD REPLACEMENT CHARACTER (�).
				//	hex = 'FFFD';
				
			} else {
				break;
			}
		}
		
		codePoint = parseInt(hex, 16);
		this.consume(n - 1);
		
		return String.fromCharCode(codePoint); 
	},
	
	
	consumeIdent: function _consumeIdent() {

		/**
		 *	4.3.3. Consume an ident-like token
		 *	http://dev.w3.org/csswg/css-syntax/#consume-an-ident-like-token0
		 *	@return	Token
		 *			<ident>, <function>, <url> or <bad-url>.
		 */
		 
		 var name = this.consumeName();
		 
		 if (name.toLowerCase() === 'url' && this.next(1) === 0x28){

			 //	 ASCII case-insensitive match for "url", and the next input character is U+0028 LEFT PARENTHESIS (()
			 this.consume(1);
			 this.consumeURL();
			 
		} else if (this.next(1) === 0x28){
			
			//	U+0028 LEFT PARENTHESIS (()
			this.consume(1);
			this.emitToken('FUNCTION', name);
			
		} else {
			
			this.emitToken('IDENT', name);
		}
		 
		 return;
	},
	
	consumeURL: function _consumeURL() {

		/**
		 *	4.3.5. Consume a url token
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-url-token0
		 *	@return	Token
		 *			<url> or <bad-url>.
		 */

		var url = '',
			string;

		if (this.isWhitespace(this.next(1))) {
			this.consume(1);
			this.consumeWhitespace();
		};


		if (isNaN(this.next(1))) {

			//	If the next input character is EOF, return the <url>.
			return url;
		}

		if (this.next(1) === 0x22 || this.next(1) === 0x27) {

			//	U+0022 QUOTATION MARK (") or U+0027 APOSTROPHE (')
			//	Handle url("foo")

			this.consume(1);

			string = this.consumeString(this.code);

			if (string.type === 'STRING') {
				
				this.consume(1);

				url = string.value;

				if (this.consumeWhitespace()) {
					this.consume(1);
				};

				if (this.code === 0x29 || isNaN(this.code)) {

					//	U+0029 RIGHT PARENTHESIS ())
					//	EOF
					
					this.emitToken('URL', url)
				}
				
			} else if (string.type === 'BAD-STRING')  {
				
				//	If a <bad-string> was returned, consume the remnants of a bad url, create a <bad-url>, and return it.
				this.emitToken('BAD-URL', [string.value, this.consumeBadURL()]);
			}
			
		} else {

			//	Handle url(foo)
			
			while (this.code) {
	
				this.consume(1);
				
				if (this.code === 0x29 || isNaN(this.code)){
					
					//	U+0029 RIGHT PARENTHESIS ())
					//	EOF
					
					this.emitToken('URL', url);
					break;
					
				} else if (this.isWhitespace(this.code)){
					
					//	This can only be the ending Whitespace
					this.consumeWhitespace();
					
					if (this.next(1) === 0x29 || isNaN(this.next(1))){
					
						//	U+0029 RIGHT PARENTHESIS ())
						//	EOF
						
						this.consume(1);
						this.emitToken('URL', url);
						break;
						
					} else {
						
						this.emitToken('BAD-URL', [url, this.hasWhitespace, this.consumeBadURL()]);
						break;
					}
					
				} else if (this.code === 0x22 || this.code === 0x27 || this.code === 0x28 || this.isNonprintable(this.code)){
					
					//	U+0022 QUOTATION MARK (")
					//	U+0027 APOSTROPHE (')
					//	U+0028 LEFT PARENTHESIS (()
					//	non-printable character
					
					//	This is a parse error. Consume the remnants of a bad url, create a <bad-url>, and return it.
					
					this.emitToken('BAD-URL', [url, this.code, this.consumeBadURL()]);
					break;
					
				} else if (this.code === 0x5C){
					
					//	U+005C REVERSE SOLIDUS

					if (this.startsWithValidEscape(this.code, this.next(1))){
						
						//	Consume an escaped character and append the returned character to the <url>’s value.
						this.consume(1);
						url += this.consumeEscape();
						
					} else {
						
						//	This is a parse error. Consume the remnants of a bad url, create a <bad-url>, and return it.
						this.emitToken('BAD-URL', [url, this.code, this.consumeBadURL()]);
						break;
					}
					
				} else {
					
					//	Append the current input character to the <url>’s value.
					url += String.fromCharCode(this.code);
				}
			}
		}
	},
	
	
	consumeBadURL: function _consumeBadURL() {

		/**
		 *	4.3.14. Consume the remnants of a bad url
		 *	http://dev.w3.org/csswg/css-syntax/#consume-the-remnants-of-a-bad-url0
		 *	@return	Token
		 *			<bad-url>.
		 *	XXX: This should somehow preserve the bad-url data
		 */
		
		var badString = [];

		while (this.code) {

			this.consume(1);

			if (this.code === 0x29 ||  isNaN(this.code)) {

				//	U+0029 RIGHT PARENTHESIS ())
				//	EOF
				
				return badString;

			} else if (this.startsWithValidEscape(this.code, this.next(1))){
				
				this.consume(1);
				badString.push(this.consumeEscape())

			} else {
				
				badString.push(this.code)
			}
		}

	},

	
	consumeName: function _consumeName() {

		/**
		 *	4.3.11. Consume a name
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-name0
		 */

		var result = '';
		
		this.consume(1);

		while(this.code) {
			
			if (this.isNamechar(this.code)) {
				
				//	Append the code point to result.
				result += String.fromCharCode(this.code);
				
			} else if (this.startsWithValidEscape(this.code, this.next(1))) {
				
				//	Consume an escaped character. Append the returned character to result.
				this.consume(1);
				result += this.consumeEscape();

			} else {
				
				//	Reconsume the current input code point. Return result.
				this.reconsume(1);
				return result;
				break;
			}
			
			this.consume(1);
		}
		
		return result;
	},
	

	consumeString: function _consumeString(aEndingCharacter) {

		/**
		 *	4.3.4. Consume a string token
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-string-token0
		 *	@return	Token
		 *			<string> or <bad-string>.
		 */

		var string	= '',
			code	= [];
		
		while (this.code) {

			this.consume(1);
			
			if (this.code === aEndingCharacter) {

				//	ending character
				return {type: 'STRING', value: string, codePoints: code, stringType: aEndingCharacter};
				break;

			} else if (this.isNewline(this.code)) {

				//	This is a parse error. Reconsume the current input character, create a <bad-string>, and return it

				this.reconsume(1);

				return {type: 'BAD-STRING', value: string};
				break;

			} else if (this.code === 92) {

				//	U+005C REVERSE SOLIDUS (\)
				
				code.push(this.code);

				if (isNaN(this.next(1))) {
					
					//	If the next input character is EOF, do nothing
					return;

				} else if (this.isNewline(this.next(1))) {

					//	Otherwise, if the next input character is a newline, consume it.
					code.push(this.next(1));
				//	this.i += 1;
					this.consume(1);
					

				} else if (this.startsWithValidEscape(this.code, this.next(1))) {

					//	Consume an escaped character and append the returned character to the <string>’s value.
					this.consume(1);
					string += this.consumeEscape();
					
				}

			} else {

				//	Append the current input character to the <string>’s value.
				string += String.fromCharCode(this.code);
				code.push(this.code);
			}

		}

		//	EOF, Return the <string>.
		//	This part is reached only on EOF

		return {type: 'STRING', value: string, codePoints: code, stringType: aEndingCharacter};
	},
	
	
	consumeNumericToken: function _consumeNumericToken() {
		
		/**
		 *	4.3.2. Consume a numeric token
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-numeric-token0
		 *	@return	Token
		 *			<number>, <percentage> or <dimension>.
		 */
		
		var number,
			dimension,
			percentage;
		
		//	Consume a number
		number = this.consumeNumber();
		
		//	If the next 3 input characters would start an identifier, then:	
		if (this.startsIdentifier(this.next(1), this.next(2), this.next(3))){
	
			//	Create a <dimension> with the same representation, value, and type flag as the returned number
			dimension = number;
			
			//	Consume a name. Set the <dimension>’s unit to the returned value.
			dimension.unit = this.consumeName();
			
			//	Return the <dimension>.
			this.emitToken('DIMENSION', dimension);
			return;
			
		} else if (this.next(1) === 0x25){
			
			//	U+0025 PERCENTAGE SIGN (%)
			
			this.consume(1);
			//	Otherwise, if the next input character is U+0025 PERCENTAGE SIGN (%), 
			
			this.emitToken('PERCENTAGE', number);
			return;
			
		} else {
			
			this.emitToken('NUMBER', number);
		}

	},
	
	
	consumeNumber: function _consumeNumber() {

		/**
		 *	4.3.12. Consume a number
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-number0
		 */

		var repr = '',
			type = 'integer',
			value,
			next;

		//	2. If the next input character is U+002B PLUS SIGN (+) or U+002D HYPHEN-MINUS (-), consume it and append it to repr.
		if (this.code === 0x2B || this.code === 0x2D) {

			//	U+002B PLUS SIGN	(+)
			//	U+002D HYPHEN-MINUS	(-)

			repr += String.fromCharCode(this.code);
			this.consume(1);
		}

		//	3. While the next input character is a digit, consume it and append it to repr.
		while (this.isDigit(this.code)) {

			repr += String.fromCharCode(this.code);
			this.consume(1);
		}
		
		this.reconsume(1);

		//	4. If the next 2 input characters are U+002E FULL STOP (.) followed by a digit, then:
		if (this.next(1) === 0x2E && this.isDigit(this.next(2))) {

			//	Consume them.
			//	Append them to repr.

			repr += String.fromCharCode(this.next(1));
			repr += String.fromCharCode(this.next(2));
			
			this.consume(1);
			this.consume(1);
			type = 'number';

			next = this.next(1);

			while (this.isDigit(next)) {

				repr += String.fromCharCode(next);
				this.consume(1);
				next = this.next(1);
			}
		}
		
		return {
			repr: repr,
			value: value,
			type: type
		};

	},
	
	
	consumeComment: function _consumeComment() {

		/**
		 *	Consume a comment
		 *	Note: not in speck but I want to preserve them
		 */

		var comment = '';

		while (this.code) {

			this.consume(1);

			if (this.code === 0x2A && this.next(1) === 0x2F) {

				//	U+002A ASTERISK (*) 
				//	U+002F SOLIDUS (/)
				//	(*/)

				this.consume(1);
				this.emitToken('COMMENT', comment);
				break;
				return;

			} else {

				comment += String.fromCharCode(this.code);
			}
		}
		
		//	This can only be reached by an EOF
		
		if (isNaN(this.code)) {
			
			//	EOF
			this.emitToken('COMMENT', comment);
		}
	},
	
	
	tokenize: function _tokenize(aStream) {

		var il = this.stream.length + 1;
		
		//	length + 1 will add an EOF token at the end

		for (; this.i < il; this.i += 1) {

			this.code = this.stream.charCodeAt(this.i);
			
			this.codePoints.push(this.code);					
				
			if (this.consumeWhitespace()) {

				//	Consume as much whitespace as possible. Return a <whitespace>.
				
				this.emitWhitespaceToken();

			} else if (this.code === 0x22) {

				//	U+0022 QUOTATION MARK (")
				//	Consume a string token with the ending character U+0022 QUOTATION MARK (") and return it.

				var string = this.consumeString(0x22);
				this.emitToken('STRING', string.value);

			} else if (this.code === 0x23) {

				//	U+0023 NUMBER SIGN (#)

				if (this.isNamechar(this.next(1)) || this.startsWithValidEscape(this.next(1), this.next(2))) {
					
					//	If the next input character is a name character or the next two input characters are a valid escape, then:

					if (this.startsIdentifier(this.next(1), this.next(2), this.next(3))) {

						//	If the next 3 input characters would start an identifier, set the <hash>’s type flag to "id".						
						
						this.emitHashToken('HASH', this.consumeName(), true);

					} else {

						this.emitToken('HASH', this.consumeName(), false);
					}

				} else {

					this.emitToken('DELIM', '#');
				}

			} else if (this.code === 0x24) {

				//	U+0024 DOLLAR SIGN ($)
				
				if (this.next(1) === 0x3D) {

					//	U+003D EQUALS SIGN (=)
					
					this.consume(1);
					this.emitToken('SUFFIXMATCH', '$=');
					

				} else {

					this.emitToken('DELIM', '$');
				}

			} else if (this.code === 0x27) {

				//	U+0027 APOSTROPHE (')
				//	Consume a string token with the ending character U+0027 APOSTROPHE (') and return it.

				var string = this.consumeString(0x27);
				this.emitToken('STRING', string.value);

			} else if (this.code === 0x28) {

				//	U+0028 LEFT PARENTHESIS (()

				this.emitToken('(', '(');

			} else if (this.code === 0x29) {

				//	U+0029 RIGHT PARENTHESIS ())

				this.emitToken(')', ')');

			} else if (this.code === 0x2A) {

				//	U+002A ASTERISK (*)

				if (this.next(1) === 0x3D) {

					//	U+003D EQUALS SIGN (=)
					
					this.consume(1);
					this.emitToken('SUBSTRINGMATCH', '*=');

				} else {
					
					this.emitToken('DELIM', '*');
				}

			} else if (this.code === 0x2B) {

				//	U+002B PLUS SIGN (+)

				if (this.startsNumber(this.code, this.next(1), this.next(2))) {

				//	this.reconsume(1);
					this.consumeNumericToken();

				} else {

					this.emitToken('DELIM', '+');
				}

			} else if (this.code === 0x2C) {

				//	U+002C COMMA (,)

				this.emitToken('COMMA', ',');

			} else if (this.code === 0x2D) {

				//	U+002D HYPHEN-MINUS (-)

				if (this.startsNumber(this.code, this.next(1), this.next(2))) {

				//	this.reconsume(1);
					this.consumeNumericToken();

				} else if (this.startsIdentifier(this.code, this.next(1), this.next(2))) {

					this.reconsume(1);
					this.consumeIdent();
				}

			} else if (this.isNamestartchar(this.code)) {

				this.reconsume(1);
				this.consumeIdent();

			} else if (this.code === 0x2E) {

				//	U+002E FULL STOP (.)

				if (this.startsNumber(this.code, this.next(1), this.next(2))) {

				//	this.reconsume(1);
					this.consumeNumericToken();

				} else {

					this.emitToken('DELIM', '.');
				}

			} else if (this.code === 0x2F) {

				//	U+002F SOLIDUS (/)

				if (this.next(1) === 0x2A) {

					//	U+002A ASTERISK (*)

					this.consume(1);
					this.consumeComment();

				} else {

					this.emitToken('DELIM', '*');
				}

			} else if (this.code === 0x3A) {

				//	U+003A COLON (:)

				this.emitToken('COLON', ':');

			} else if (this.code === 0x3B) {

				//	U+003B SEMICOLON (;)

				this.emitToken('SEMICOLON', ';');

			} else if (this.code === 0x3C) {

				//	U+003C LESS-THAN SIGN (<)

				if (this.next(1) === 0x21 && this.next(2) === 0x2D && this.next(3) === 0x2D) {
					
					//	 U+0021 EXCLAMATION MARK U+002D + HYPHEN-MINUS U+002D + HYPHEN-MINUS (!--)

					this.consume(1);
					this.consume(1);
					this.consume(1);
					this.emitToken('CDO', '<!--');

				} else {

					this.emitToken('DELIM', '<');
				}

			} else if (this.code === 0x40) {

				//	U+0040 COMMERCIAL AT (@)

				if (this.startsIdentifier(this.next(1), this.next(2), this.next(3))) {

					this.emitToken('AT-KEYWORD', this.consumeName());

				} else {

					this.emitToken('DELIM', '@');
				}

			} else if (this.code === 0x5B) {

				//	U+005B LEFT SQUARE BRACKET ([)

				this.emitToken('[', '[');

			} else if (this.code === 0x5B) {

				//	U+005B LEFT SQUARE BRACKET ([)

				this.emitToken('[', '[');

			}  else if (this.code === 0x5C) {

				//	U+005C REVERSE SOLIDUS (\)

				if (this.startsWithValidEscape(this.code, this.next(1))) {
					
					this.reconsume(1);
					this.consumeIdent();
					
				} else {
					
					this.emitToken('DELIM', '\\');
				}

			} else if (this.code === 0x5D) {

				//	U+005D RIGHT SQUARE BRACKET (])

				this.emitToken(']', ']');

			} else if (this.code === 0x7B) {

				//	U+007B LEFT CURLY BRACKET ({)

				this.emitToken('{', '{');

			} else if (this.code === 0x7D) {

				//	U+007D RIGHT CURLY BRACKET (})

				this.emitCurlyToken('}', '}');

			} else if (this.isDigit(this.code)) {

				//	digit
				
				this.consumeNumericToken();

			} else if (this.code === 0x7C) {

				//	U+007C VERTICAL LINE (|)

				if (this.next(1) === 0x3D) {

					//	U+003D EQUALS SIGN (=),

					this.consume(1);
					this.emitToken('DASHMATCH', '|=');

				} else {

					this.emitToken('DELIM', '|');
				}

			} else if (this.code === 0x7E) {

				//	U+007E TILDE (~)

				if (this.next(1) === 0x3D) {

					//	U+003D EQUALS SIGN (=),

					this.consume(1);
					this.emitToken('INCLUDEMATCH', '~=');

				} else {

					this.emitToken('DELIM', '~');
				}

			} else if (isNaN(this.code)) {
								
			} else {

				this.emitToken('DELIM', String.fromCharCode(this.code));
			}
		}
		
		this.emitTokenEOF('EOF', 'EOF');
	}
}