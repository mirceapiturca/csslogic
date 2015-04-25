CSSLogic tokenizer and parser
=========
Demo: <b>http://mirceapiturca.github.io/cssLogic//</b>

```javascript
var string = ".foo {font-size: 2.1m}"

/* Returns a list of tokens */
var tokens = new Tokenizer(string);

/* Returns a list of CSS rules */
var rules = new Parser(string);
```
Simple fast CSS tokenizer based on Tab Atkins and Simon Sapin CSS Syntax Module Level 3 http://dev.w3.org/csswg/css-syntax/

### Todo:
1. Add tests
2. Add selector parsing
3. Match rule to grammar 
