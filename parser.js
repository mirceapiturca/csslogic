'use strict';

/**
 *	Author: Mircea Piturca @mirceadesign.
 *	Implementation of http://dev.w3.org/csswg/css-syntax/
 */


//	5.3.1 Parse a stylesheet

var Parser = function _Parser(aStream, aEntryPoint) {

	this.i		= 0;
	this.stream	= aStream;
	
	if (aEntryPoint === 'Parse a component value') {
		
		return this.parseComponentValue();
		
	} else if (aEntryPoint === 'Parse a declaration') {
		
		return this.parseDeclaration();
		
	} else if (aEntryPoint === 'Parse a comma-separated list of component values') {
		
		return this.parseComponentValueList();
		
	} else if (aEntryPoint === 'Parse a list of declarations') {
		
		return this.consumeDeclarationsList(aStream);
		
	} else if (aEntryPoint === 'Parse a list of rules') {
		
		return this.consumeListOfRules(aStream);
		
	} else {
		
		return this.parse();
	}
}

Parser.prototype = {

	consume: function _consume(x) {
		
		this.i 		+= x;
		this.token	= this.stream[this.i];
	},

	reconsume: function _reconsume(x) {
		
		if (this.i !== 0) {
			this.i -= x;
		}
		
		this.token = this.stream[this.i];
	},
	
	
	parse: function _parse() {
		
		/**
		 *	5.3.1 Parse a stylesheet
		 *	http://dev.w3.org/csswg/css-syntax/#parse-a-stylesheet
		 *
		 *	@param	this.stream
		 *			array of tokens
		 */

		this.topLevelFlag 	= true;
		this.styleSheet		= [];

		return this.consumeListOfRules(this.stream);
	},
	
	
	parseComponentValue: function _parseComponentValue() {
		
		/**
		 *	5.3.7 Parse a component value
		 *	http://dev.w3.org/csswg/css-syntax/#parse-a-component-value0
		 *
		 *	@param	this.stream
		 *			array of tokens
		 */
		 
		var value;
		 
		this.token	= this.stream[this.i];
		this.type	= this.token.type ;
		
		if (this.type === 'WHITESPACE') {
			this.consume(1);
		}
			
	    if (this.type === '{' || this.type === '[' || this.type === '(') {

	        //	If the current input token is a <{>, <[>, or <(>, consume a simple block and return it.
	        value = this.consumeBlock();

	    } else if (this.type === 'FUNCTION') {

	        //	If the current input token is a <function>, consume a function and return it.
	        value = this.consumeFunction();

	    } else if (this.type === 'EOF') {
			
			return false;
		
		} else {

	        //	Return the current input token.
	        value = this.token;
	    }
		
		return value;
	},
	
	
	parseComponentValueList: function _parseComponentValueList() {
		
		/**
		 *	5.3.9. Parse a comma-separated list of component values
		 *	http://dev.w3.org/csswg/css-syntax/#parse-comma-separated-list-of-component-values
		 *
		 *	@param	this.stream
		 *			array of tokens
		 */
		 
		 var lists = [];
		 this.token = this.stream[this.i];
		
		//	consumeComponentValue() will consume first token, if this.i === 0, it will start from 1 
		 this.i = -1;

		 while (this.token.type !== "EOF") {

		 	this.token = this.consumeComponentValue();

		 	if (this.token.type === 'WHITESPACE' || this.token.type === 'COMMA') {
		 		continue;
		 	} else {
		 		lists.push(this.token)
		 	}
		 }
		 
		 return lists;
	},
	
	
	parseDeclaration: function _parseDeclaration() {
		
		//	1. While the next input token is a <whitespace-token>, consume the next input token.
		if (this.stream[0].type === 'WHITESPACE') {
			this.stream.shift();
		}
		
		//	2. If the next input token is not an <ident-token>, return a syntax error.
		if (this.stream[0].type !== 'IDENT') {
			return false;
		}
		
		//	3. Consume a declaration. If anything was returned, return it. Otherwise, return a syntax error.
		var i	= 0,
			il 	= this.stream.length,
			block = {type: 'block', value: []},
			token,
			type,
			componentValue
			
			this.i = 0
	
		for (; this.i < il; this.i += 1) {
		
			this.token = this.stream[this.i]
			this.type = this.token.type;
			
			if (this.type === 'EOF') {
				
				//	Return the block.
				block.value.push({type: 'EOF', value: 'EOF'});
				break;
				
			} else {
				
				//	Reconsume the current input token. Consume a component value and append it to the value of the block.
				
				if (this.type === '{' || this.type === '[' || this.type === '(') {
		
					//	If the current input token is a <{>, <[>, or <(>, consume a simple block and return it.
		
					block.value.push(this.consumeBlock());
		
				} else if (this.type === 'FUNCTION') {
		
					//	If the current input token is a <function>, consume a function and return it.
					block.value.push(this.consumeFunction());
		
				} else {
		
					//	Return the current input token.
					block.value.push(this.token);
				}

			}
		} 
	
		var	list = this.consumeDeclarationsList(block.value);
		return list[0];
	},
	
	
	consumeListOfRules: function _consumeListOfRules(aStream) {

		/**
		 *	5.4.1 Consume a list of rules
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-list-of-rules0
		 *
		 *	@param	aStream
		 *			array of tokens
		 */
		 
		 
		var il		= aStream.length,
			list	= [],
			qualifiedRule,
			atRule;

		for (; this.i < il; this.i += 1) {

			this.token	= aStream[this.i];
			this.type	= this.token.type;
			
		//	console.log('consumeListOfRules', this.i, this.token, this.token.idx)
			
			if (this.type === 'WHITESPACE') {
				
				//	Do nothing.
				
			} else if (this.type === 'EOF') {
				
				//	console.log('main EOF')
				//	Return the list of rules.
				return list;
				
			} else if (this.type === 'CDO' || this.type === 'CDC') {
				
				if (this.topLevelFlag) {
					
					//	If the top-level flag is set, do nothing.
					
				} else {
				
					//	Reconsume the current input token. Consume a qualified rule.
					
					this.reconsume(1);
					qualifiedRule = this.consumeQualifiedRule();
					
					if (qualifiedRule) {
						
						//	If anything is returned, append it to the list of rules.
						list.push(qualifiedRule);
					}
				}
				
			} else if (this.type === 'AT-KEYWORD') {
				
				//	Reconsume the current input token. Consume an at-rule.
				
				atRule = this.consumeAtRule();
				
				if (atRule) {
						
					//	If anything is returned, append it to the list of rules.
					list.push(atRule);
				}
				
			} else {
				
				//	Reconsume the current input token. Consume a qualified rule.
				
				this.reconsume(1);
				qualifiedRule = this.consumeQualifiedRule();
					
				if (qualifiedRule) {
						
					//	If anything is returned, append it to the list of rules.
					list.push(qualifiedRule);
				}
			}
		} 
	},
	
	
	consumeAtRule: function _consumeAtRule() {
		
		/**
		 *	5.4.2 Consume an at-rule
		 *	http://dev.w3.org/csswg/css-syntax/#consume-an-at-rule
		 *
		 *	@param	aStream
		 *			array of tokens
		 */
		 
		 //	Create a new at-rule with its name set to the value of the current input token, its prelude initially set to an empty list, and its value initially set to nothing.
		 
		var atRule = {
			name		: this.token.value,
			prelude		: [],
			value		: [],
		}
		
		while (this.token) {
			
			this.consume(1);
			
			this.type = this.token.type;
			
			if (this.type === 'EOF' || this.type === 'SEMICOLON') {
				
				//	<semicolon-token> || <EOF-token> Return the at-rule.
				
				return atRule;
				break;
				
			} else if (this.type === '{' || this.type === 'SEMICOLON') {
				
				//	<{-token> Consume a simple block and assign it to the at-rule’s block. Return the at-rule.
				
				atRule.value = this.consumeBlock();
				return atRule;
				break;
				
			} else if (this.type === 'block' && this.token.associated.value === '{') {
				
				//	simple block with an associated token of <{-token>
				
				atRule.value = this.token;
				return atRule;
				break;
				
			} else {
				
				//	Reconsume the current input token. Consume a component value. Append the returned value to the at-rule’s prelude.
				
				this.reconsume(1);
				atRule.prelude.push(this.consumeComponentValue());
			}
		}
	},
	
	
	consumeQualifiedRule: function _consumeQualifiedRule() {
		
		/**
		 *	5.4.3 Consume a qualified rule
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-qualified-rule0
		 *
		 *	@param	aStream
		 *			array of tokens
		 */
		 
		//	Create a new qualified rule with its prelude initially set to an empty list, and its value initially set to nothing.
		
		var qualifiedrule = {
			prelude		: [],
			value		: []
		}
		
		var list	= [],
			atRule,
			block,
			component,
			declarationsList;
		
		while (this.token) {
		
			this.consume(1);
			
			this.type = this.token.type;
			
			if (this.type === 'EOF') {
				
				//	This is a parse error. Return nothing.
				this.reconsume(1)
				return null;
				break;
				
			} else if (this.type === '{') {
				
				//	Consume a simple block and assign it to the qualified rule's block. Return the qualified rule.
				
				qualifiedrule.start	= this.i + 1;
				block			= this.consumeBlock();
				declarationsList	= this.consumeDeclarationsList(block.value);
				qualifiedrule.value	= declarationsList;
				qualifiedrule.end	= this.i - 1;
				
				this.clearTrailingWhitespace(qualifiedrule.prelude);

				return qualifiedrule;
				break;
				
			} else if (this.type === 'block' && this.token.associated.value === '{') {
				
				//	Assign the block to the qualified rule's block. Return the qualified rule.
				
				if (!block) {
					
					declarationsList = this.consumeDeclarationsList(this.token.value);
					qualifiedrule.value = declarationsList;
					
				} else {
				
					declarationsList = this.consumeDeclarationsList(block.value);
					qualifiedrule.value = declarationsList;
				}
				

				this.clearTrailingWhitespace(qualifiedrule.prelude);
				
				return qualifiedrule;
				break;	
				
			} else {
				
				//	Reconsume the current input token. Consume a component value. Append the returned value to the qualified rule's prelude.
				
				this.reconsume(1);
				var consumeComponentValue = this.consumeComponentValue()
				qualifiedrule.prelude.push(consumeComponentValue);
			
			}
		}
	},
	
	
	consumeBlock: function _consumeBlock() {
		
		/**
		 *	5.4.7 Consume a simple block
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-simple-block0s
		 */
		 
		var block		= {type: 'block', associated: this.token, value: []},
			endingToken	= '',
			componentValue;
		
		if (this.type === '{') {
			endingToken = '}';
		} else if (this.type === '[') {
			endingToken = ']';
		} else if (this.type === '(') {
			endingToken = ')';
		}
		
		while (this.token) {
		
			this.consume(1);
			this.type = this.token.type;
			
			if (this.type === endingToken || this.type === 'EOF') {
				
				//	Return the block.
				
				block.value.push({type: 'EOF', value: 'EOF'});
				
				if (this.type === 'EOF') {
					this.reconsume(1);
				}
				
				return block;
				break;
				
			} else {
				
				//	Reconsume the current input token. Consume a component value and append it to the value of the block.
				
				this.reconsume(1);
				componentValue = this.consumeComponentValue();
				block.value.push(componentValue);
			}
		} 
	},
	
	
	consumeFunction: function _consumeFunction() {
		
		/**
		 *	5.4.8 Consume a function
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-function
		 */
		
		var fnct		= { type: 'function', name: this.token.value, arguments: [], token: this.token, column: this.token.column},
			codePoints	= [].concat(this.token.codePoints),
			argument	= [],
			exit		= true;
			
		while (this.token) {
		
			this.consume(1);
			this.type	= this.token.type;
			
			if (this.type === ')' || this.type === 'EOF') {
				
				//	Return the function.
				
				//	Add the function closing parenthesis ")" token
				//	The start parenthesis "(" is includen into fnct.token allong with function name
				
				fnct.rightParenthesis = this.token;
				
				this.clearTrailingWhitespace(argument);
				argument.push({type: 'EOF', value: 'EOF'});
				fnct.arguments.push(argument);
				codePoints = codePoints.concat(this.token.codePoints);
				fnct.idx = this.token.idx
				
				if (this.type === 'EOF') {
					this.reconsume(1);
				}
				
				fnct.codePoints = codePoints
				return fnct;
				break;
				
			} else if (this.type === 'COMMA') {
				
				//	Append the current argument to the function's argument list.
				//	Create a new current argument which is initially empty.
				
				this.clearTrailingWhitespace(argument);
				argument.push(this.token);
				argument.push({type: 'EOF', value: 'EOF'});
				codePoints = codePoints.concat(this.token.codePoints);
				fnct.arguments.push(argument);
				argument = [];

			} else {
				
				//	Consume a component value. 
				//	If anything was returned, 
				//	append the returned value to the value of the current argument; 
				//	otherwise, set the valid flag to false.
				
				this.reconsume(1);
				var arg = this.consumeComponentValue();
				codePoints = codePoints.concat(arg.codePoints);
				argument.push(arg);
			}
		} 
	},
	
	
	consumeComponentValue: function _consumeComponentValue() {

	    /**
	     *	5.4.6 Consume a component value
	     *	http://dev.w3.org/csswg/css-syntax/#consume-a-component-value0
	     */

		this.consume(1);
		this.type		= this.token.type;

	    if (this.type === '{' || this.type === '[' || this.type === '(') {

	        //	If the current input token is a <{>, <[>, or <(>, consume a simple block and return it.

	        return this.consumeBlock();

	    } else if (this.type === 'FUNCTION') {

	        //	If the current input token is a <function>, consume a function and return it.
	        return this.consumeFunction();

	    } else {

	        //	Return the current input token.
	        return this.token;
	    }
	},
	
	
	consumeDeclarationsList: function _consumeDeclarationsList(aBlock) {
		
	    /**
	     *	5.4.4 Consume a list of declarations
	     *	http://dev.w3.org/csswg/css-syntax/#consume-a-list-of-declarations
	     */
		 
		var i			= 0,
			il		= aBlock.length,
			declarations	= [],
			declaration,
			temp,
			token,
			type,
			value
			
		for (; i < il; i += 1) {
			
			token = aBlock[i];
			type = token.type;
			
			if (type === 'WHITESPACE' || type === 'SEMICOLON' || type === 'COMMENT') {
				
				//	Do nothing.
				
			} else if (type === 'EOF') {
				
				//	Return the list of declarations.

				return declarations;
				
			} else if (type === 'AT-KEYWORD') {
				
				//	Consume an at-rule. Append the returned rule to the list of declarations.
				
			} else if (type === 'IDENT') {
				
				temp = [token];
				
				while (i < aBlock.length) {
					
					i	+= 1;
					token	= aBlock[i];
					type	= token.type;
					
					if (type === 'SEMICOLON' || type === 'EOF') {
						
						//	Consume a declaration from the temporary list.
						
						temp.push({type: 'EOF', value: 'EOF', token: token});
						declaration = this.consumeDeclaration(temp);
						
						if (declaration) {

							temp[0].isDeclarationName = true;
							declaration.semicolon = token;
							declarations.push(declaration);
						}
						
						if (type === 'EOF') {
							
							//	Trigger the first EOF
							i -= 1;
						}

						break;
						
					} else {
						
						temp.push(token);
					}
				}
				
			} else {
				
				//	This is a parse error. Repeatedly consume a component value until it is a <semicolon> or <EOF>.

				while (type !== 'SEMICOLON' && type !== 'EOF') {

					i	+= 1;
					token	= aBlock[i];
					type	= token.type;
										
					if (type === '{' || type === '[' || type === '(') {
			
						//	If the current input token is a <{>, <[>, or <(>, consume a simple block and return it.
			
						this.consumeBlock();
			
					} else if (type === 'FUNCTION') {
			
						//	If the current input token is a <function>, consume a function and return it.
						//	Takes the name from this.token. We are passing token to this.token
						
						this.token = token
						this.consumeFunction();
					}
				}
				
				if (type === 'EOF') {
							
					//	Trigger the first EOF
					i -= 1;
				}
			}
		}
	},
	
	
	consumeDeclaration: function _consumeDeclaration(aBlock) {

		/**
		 *	5.4.5 Consume a declaration
		 *	http://dev.w3.org/csswg/css-syntax/#consume-a-declaration
		 */

		var temp		= aBlock,
			declaration	= {},
			d		= 0,
			token,
			type;

		declaration.name	= temp[d];
		declaration.value	= [];
		declaration.important	= false;

		d += 1;

		if (temp[d].type === 'WHITESPACE') {

			//	While the current input token is a <whitespace>, consume the next input token.
			d += 1;
		}


		if (temp[d].type !== 'COLON') {

			//	If the current input token is anything other than a <colon>, this is a parse error. Return nothing.
			return;

		} else {
			
			declaration.colon = temp[d];
			d += 1;
		}

		while (temp[d].type !== 'EOF') {

			//	While the current input token is anything other than an <EOF>, append it to the declaration's value and consume the next input token.

			token	= temp[d];
			type	= token.type;
			d	+= 1;

			declaration.value.push(token);
		}

		var v	= declaration.value.length,
			t	= 0,
			str	= '';

		while (v--) {

			//	If the last two non-whitespace tokens in the declaration's value are a delim token with the value "!" followed by an ident token with a value that is an ASCII case-insensitive match for "important",

			if (declaration.value[v].type === 'WHITESPACE') {
				t += 1;
				continue;
			}

			str	+= declaration.value[v].value;
			t	+= 1;

			if (str.toLowerCase() === 'important!') {

				declaration.important = true;
				break;

			} else if (t === 4) {
				break;
			}
		}

		return declaration;
	},
	
	
	clearTrailingWhitespace: function _clearTrailingWhitespace(aBlock) {
		
		/**
		 *	Helper function, not in speck
		 *	Removes the first and last <WHITESPACE> if any
		 *	Used to make future parsing easyer
		 */
		
		var length = aBlock.length,
			lastToken;
			
		if (!length){return; }
		
		//	Clear first token
		if (aBlock[0].type === 'WHITESPACE') {
			aBlock.splice(0, 1);
		}
		
		//	Clear last token
		lastToken = aBlock[aBlock.length - 1];
		
		if (lastToken && lastToken.type === 'WHITESPACE') {
			aBlock.splice(aBlock.length - 1, 1);
		}
	},
}
