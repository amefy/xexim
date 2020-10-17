// Metab Language 1.0.7
// Author: Amefy
// Copyright (c) 2016 Amefy under license Apache-2.0
// Language based on Coffeescript, Copyright (c) 2009-2015 Jeremy Ashkenas (https://github.com/jashkenas/coffeescript)

(()=>{
var Funcs;





class JoinWith {
	constructor(...args) {
		this.res = null;
		if(!(this.constructor.prototype instanceof JoinWith) && this.init)return this.init(...args);
	}
	init(elems, type, val) {
		var e;
		this.res = [];
		for (var i in elems) {
			e = elems[i];
			if (e[0] === 'EOL') {
				this.res.push([
					type,
					val,
					e[2]
				]);
			}
			else {
				this.res.push(e);
			}
		}
	}

}
Funcs = {
	JoinWith : JoinWith,
	Unchild : (tokens, prevtoken) => {
		var Join,res,t,i,childs;
		Join = 'EOL';

		if (prevtoken) {
			if (tokens[0][0] === 'INDENT') {
				if (prevtoken[0] === '->') {
					Join = 'FUNC';
				}
				else {
					if (prevtoken[0] === ',') {
						Join = 'LIST';
					}
				}
			}
			else {
				Join = 'LIST';
			}
		}
		else {
			if (tokens[0][0] === '(' || tokens[0][0] === '[' || tokens[0][0] === '{') {
				Join = 'LIST';
			}
		}

		if ((tokens[1][0] === 'TAG' || tokens[1][0] === 'STRING') && tokens[2][0] === ':' && tokens[0][0] !== 'CLASS') {
			Join = 'OBJ';
		}

		if (prevtoken && (prevtoken[0] === '{' || prevtoken[0] === '[')) {
			Join = 'LIST';
		}

		res = [];
		for (var i in tokens) {
			t = tokens[i];
			i = parseInt(i);
			if (t[0] === 'CHILD') {
				childs = Funcs.Unchild(t[1], (i > 0? tokens[i - 1] : undefined));
				res = res.concat(childs);
			}
			else {
				if (t[0] === 'INDENT') {
					if (Join === 'OBJ') {
						res.push(Funcs.ChangeToken(t, '{', '{'));
					}
					else {
						if (Join !== 'LIST') {
							res.push(t);
						}
					}
				}
				else {
					if (t[0] === 'OUTDENT') {
						if (Join === 'OBJ') {
							res.push(Funcs.ChangeToken(t, '}', '}'));
						}
						else {
							if (Join !== 'LIST') {
								res.push(t);
							}
						}
					}
					else {
						if (t[0] === 'EOB' || t[0] === 'EOL') {
							if (Join === 'OBJ') {
								if (i + 1 !== tokens.length - 1) {
									res.push(Funcs.ChangeToken(t, ',', ','));
								}
							}
							else {
								if (Join === 'FUNC') {
									res.push(Funcs.ChangeToken(t, ';', ';'));
								}
								else {
									if (Join === 'LIST') {
										if (i + 1 !== tokens.length - 1 && res[res.length - 1][0] !== ',' && tokens[i + 1][0] !== ',') {
											res.push(Funcs.ChangeToken(t, ',', ','));
										}
									}
									else {
										res.push(Funcs.ChangeToken(t, 'EOL', '\n'));
									}
								}
							}
						}
						else {
							res.push(t);
						}
					}
				}
			}
		}

		return res = Funcs.RemoveUnusedEols(res);
	},
	
	RemoveUnusedEols : (tokens) => {
		var res,t,i;
		res = [];
		for (var i in tokens) {
			t = tokens[i];
			i = parseInt(i);
			if (!((t[0] === ';' || t[0] === 'EOL') && res[res.length - 1][0] === 'OUTDENT' && ([
				'ELSE',
				'CATCH',
				'FINALLY'
			].includes(tokens[i + 1][0])))) {
				res.push(t);
			}
		}
		return res;
	},
	
	CloseCalls : (tokens) => {
		var res,openCalls,t,i;
		res = [];
		openCalls = [];

		for (var i in tokens) {
			t = tokens[i];
			i = parseInt(i);
			if (t[0] === 'CHILD') {
				if ((t[1][0][0] === 'INDENT' && (!tokens[i - 1]  || (tokens[i - 1][0] !== ',' && tokens[i - 1][0] !== '->')) && tokens[i + 1][0] !== ',') || i + 1 === tokens.length) {
					while (openCalls.length > 0) {
						openCalls[openCalls.length - 1][1].push(Funcs.ChangeToken(tokens[i - 1], ')', ')'));
						if (openCalls.length > 1) {
							openCalls[openCalls.length - 2][1].push(openCalls[openCalls.length - 1]);
							openCalls.pop();
						}
						else {
							res.push(openCalls.pop());
						}
					}
				}

				t[1] = Funcs.CloseCalls(t[1]);
			}
			else {
				if (t[0] === 'CALLIN') {
					openCalls.push([
						'CHILD',
						[
							Funcs.ChangeToken(t, '(', '(')
						]
					]);

					continue;
				}
				else {
					if (((t[0] === 'EOL' || t[0] === 'EOB' || t[0] === ';' || t[0] === 'IF' || t[0] === 'CHILD') && (!tokens[i - 1]  || tokens[i - 1][0] !== ',') && tokens[i + 1][0] !== ',') || i + 1 === tokens.length) {
						while (openCalls.length > 0) {
							openCalls[openCalls.length - 1][1].push(Funcs.ChangeToken(t, ')', ')'));
							if (openCalls.length > 1) {
								openCalls[openCalls.length - 2][1].push(openCalls[openCalls.length - 1]);
								openCalls.pop();
							}
							else {
								res.push(openCalls.pop());
							}
						}
					}
				}
			}



			if (openCalls.length > 0) {
				openCalls[openCalls.length - 1][1].push(t);
			}
			else {
				res.push(t);
			}
		}

		return res;
	},
	
	
	
	RemoveSpaces : (tokens) => {
		var res;
		res = [];
		for (var v of tokens) {
			if (v[0] !== 'SPACE') {
				res.push(v);
			}
		}
		return res;
	},
	
	ChangeToken : (token, type, val) => {
		while (token[0] === 'CHILD') token = token[1][token[1].length - 1]

		return [
			type,
			val,
			token[2]
		];
	},
	
	
	Concat : (arr, elems) => {
		if (!(Array.isArray(arr))) {
			arr = [
				arr
			];
		}
		if (!(Array.isArray(elems))) {
			elems = [
				elems
			];
		}

		return arr.concat(elems);
	},
	
	parseError : (message, err) => {
		console.info(message + ' expecting ' + err.expected);
		throw message;


	}
};




class AstNode {
	constructor(...args) {
		this.Type = null;
		this.Parent = null;
		this.Loc = null;
		if(!(this.constructor.prototype instanceof AstNode) && this.init)return this.init(...args);
	}

	init(loc) {
		this.Type = this.constructor.name;
		this.Loc = loc;

		if (this.Loc != null) {
			if (this.Loc.firstLine != null) {
				if (!(this.Loc.col != null)) {
					this.Loc.col = 0;
				}
				if (!(this.Loc.toCol != null)) {
					this.Loc.toCol = 1;
				}
				if (!(this.Loc.toLine != null)) {
					this.Loc.toLine = 0;
				}
			}
			else {
				if (Array.isArray(this.Loc)) {
					for (var loc of this.Loc) {
						if (loc) {
							if (!(loc.col != null)) {
								loc.col = 0;
							}
							if (!(loc.toCol != null)) {
								loc.toCol = 1;
							}
							if (!(loc.line != null)) {
								loc.line = 0;
							}
							if (!(loc.toLine != null)) {
								loc.toLine = 0;
							}
						}
					}
				}
			}
		}
	}

	Tabs(n) {
		var res,i;
		res = '';
		i = 0;
		while (i < n) {
			res += '\t';
			i++;
		}
		return res;
	}

	SetParent(parent) {
		this.Parent = parent;
	}

	SetChildParents(childs) {
		for (var c of childs) c.SetParent(this)
	}

	GetLocalVars() {
		return [];
	}
	GetChildLocalVars(childs) {
		var res,locals;
		res = [];
		for (var c of childs) {
			locals = c['GetLocalVars']();

			for (var l of locals) {
				if (!(res.includes(l))) {
					res.push(l);
				}
			}
		}

		return res;
	}

	TransformAST(locals, classNames) {
		void 0 ;
	}
	TransformASTInChild(childs, locals, classNames) {
		for (var c of childs) c['TransformAST'](locals, classNames)
	}

	GetMappings() {
		if (this.Loc != null) {
			return [
				this.Loc
			];
		}
		else {
			return [];
		}
	}

	CloneObj(obj) {
		return JSON.parse(JSON.stringify(obj));
	}

	getASTAsString(tabs) {
		return tabs + this.Type;
	}

}



class Document extends AstNode {
	constructor(...args) {
		super(...args);
		this.HasAwaits = false;
		this.HasExports = false;
		this.File = null;
		this.Childs = null;
		this.ClassNames = {
			Variables : [],
			StaticVariables : [],
			Methods : [],
			StaticMethods : [],
			Consts : [],
			Enums : [],
			Class : null,
			Function : null,
			Classes : {}
		};
		this.showComments = true;
		if(!(this.constructor.prototype instanceof Document) && this.init)return this.init(...args);
	}

	init(childs, loc) {
		AstNode.prototype.init.call(this,loc);

		this.ClassNames.Document = this;
		this.Childs = childs;
	}

	ProcessAST(file=null, cbimport, cb, ce) {
		var importings;
		this.SetParents();

		importings = [];
		for (var c of this.Childs) {
			if (c.Type === 'Import') {
				importings.push(new Promise((cbp, cep) => {
					cbimport(file, c.Path.substr(1, c.Path.length - 2), (nodes) => {
						var v;
						if (nodes && nodes.ClassNames) {
							for (var k in nodes.ClassNames.Classes) {
								v = nodes.ClassNames.Classes[k];
								if (!(this.ClassNames.Classes[k])) {
									this.ClassNames.Classes[k] = v;
								}
							}
						}
						cbp();
					}, cep);
				}));
			}
		}

		Promise.all(importings).then(() => {
			this.TransformAST();
			cb();
		}).catch(ce);
	}

	ProcessASTSync(file=null, cbimport) {
		var nodes,v;
		this.SetParents();

		for (var c of this.Childs) {
			if (c.Type === 'Import') {
				nodes = cbimport(file, c.Path.substr(1, c.Path.length - 2));
				if (nodes && nodes.ClassNames) {
					for (var k in nodes.ClassNames.Classes) {
						v = nodes.ClassNames.Classes[k];
						if (!(this.ClassNames.Classes[k])) {
							this.ClassNames.Classes[k] = v;
						}
					}
				}
			}
		}

		this.TransformAST();
	}

	getCode(tabs, tabsin, file='file', cb, ce) {
		try {
			cb(this.getCodeSync(tabs, tabsin, file));
		}
		catch(e) {
			ce(e);
		};
	}

	getCodeSync(tabs, tabsin, file) {
		var res;
		this.File = file;
		res = '';

		if (this.HasExports) {
			res += 'Metab.r = function(){var Export={};\n\n';
		}

		if (this.HasAwaits) {

			res += (this.HasExports? 'return ' : '') + "(async ()=>{\n\n";
			tabs++;
			tabsin++;
		}

		for (var c of this.Childs) res += c['GetCode'](tabs, tabs) + ([
			'If',
			'Switch',
			'Class',
			'Export',
			'Import',
			'Comment',
			'ForRange',
			'For',
			'Do',
			'While',
			'Function',
			'EmptyLine'
		].includes(c.Type)? '' : ';') + '\n'

		if (this.HasAwaits) {

			if (this.HasExports) {
				res += this.Tabs(tabs) + 'return Export;\n';
			}
			res += "\n})(this);";
		}

		if (this.HasExports) {
			res += '\n' + (this.HasAwaits? '' : 'return Export;') + '}';
		}

		return res;
	}


	TransformAST() {
		var locals;
		locals = this.GetLocalVars();

		if (locals.length > 0) {
			this.Childs.unshift(new LocalVar(locals));
		}

		this.TransformASTInChild(this.Childs, locals, this.ClassNames);
	}

	SetParents() {
		this.SetChildParents(this.Childs);
	}

	GetLocalVars() {
		return this.GetChildLocalVars(this.Childs);
	}

	getMappings() {
		var end,res,ms;
		this.Loc = {
			firstCol : 0,
			firstLine : 0,
			lastCol : 0,
			lastLine : 0,
			toCol : 0,
			col : 0,
			toLine : 0,
			line : 0
		};
		end = this.CloneObj(this.Loc);

		res = [];

		if (this.HasExports) {
			this.Loc.toLine += 2;

		}

		if (this.HasAwaits) {
			this.Loc.toLine += 2;

		}

		res = [
			this.Loc
		];


		for (var c of this.Childs) {
			ms = c['GetMappings']();

			res = res.concat(ms);
			res[res.length - 1].toLine++;

		}


		if (this.HasAwaits) {
			end.line = 1;
			end.toCol = 54 + (this.HasExports? 6 : 7) + 102;

		}

		if (this.HasExports) {
			end.line++;
			end.toCol = (this.HasAwaits? 0 : 14) + 1;

		}

		return res.concat([
			end
		]);
	}

	getASTAsString(tabs) {
		var h;
		tabs = '';
		h = 'Document';
		for (var c of this.Childs) h += '\n' + tabs + c.getASTAsString(tabs + '\t')
		return h;
	}

}




Funcs.Document = Document;


class Block extends AstNode {
	constructor(...args) {
		super(...args);
		this.Body = null;
		this.Inline = null;
		this.Pre = null;
		this.Post = null;
		this.PreIn = null;
		this.PostIn = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Block) && this.init)return this.init(...args);
	}
	init(body, inline, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Body = body;
		this.Inline = inline;
		this.Pre = '';
		this.Post = '';
		this.PreIn = '';
		this.PostIn = '';
	}

	GetCode(tabs, tabsin) {
		var body;
		body = this.Pre;

		this.TabsIn = [
			tabs,
			tabsin
		];

		if (this.Body.length > 1 || this.Body.length === 0 || this.Inline !== true || (this.Body.length === 1 && ([
			'If',
			'Switch',
			'Class',
			'ForRange',
			'For',
			'Do',
			'While'
		].includes(this.Body[0].Type)))) {
			body += '{\n' + this.PreIn;
			for (var s of this.Body) body += s.GetCode(tabsin + 1, tabsin + 1) + (([
				'If',
				'Switch',
				'Class',
				'Export',
				'Import',
				'Comment',
				'ForRange',
				'For',
				'Do',
				'While',
				'Function',
				'EmptyLine'
			].includes(s.Type))? '' : ';') + '\n'
			body += this.Tabs(tabsin) + this.PostIn + '}' + this.Post;
		}
		else {
			body = this.Pre + this.PreIn + this.Body[0].GetCode(0, tabsin) + this.PostIn + this.Post;
		}

		return body;
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.SetChildParents(this.Body);
	}

	GetLocalVars() {
		return this.GetChildLocalVars(this.Body);
	}

	TransformAST(locals, classNames) {

		this.TransformASTInChild(this.Body, locals, classNames);
	}

	GetMappings() {
		var body,newLine;
		if (this.Body.length > 1 || this.Body.length === 0 || this.Inline !== true) {
			body = [];
			this.Loc[0].col = this.TabsIn[0];
			this.Loc[0].toCol = 1;
			this.Loc[0].toLine = 1;


			body = body.concat([
				this.Loc[0]
			]);

			for (var s of this.Body) {
				newLine = this.CloneObj(this.Loc[0]);
				newLine.col = 0;
				newLine.toCol = 0;
				newLine.toLine = 1;
				body = body.concat(s.GetMappings(), [
					newLine
				]);

			}
			this.Loc[1].col = this.TabsIn[1];
			this.Loc[1].toCol = 1;
			body = body.concat([
				this.Loc[1]
			]);

		}
		else {
			body = this.Body[0].GetMappings();

		}

		return body;
	}

	getASTAsString(tabs) {
		var h;
		h = tabs + 'Block';
		var i=0
		for (var c of this.Body) {
			h += '\n' + c.getASTAsString(tabs + '\t');
			i++;
		}

		return h;
	}

}

Funcs.Block = Block;

class Class extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Extends = null;
		this.Body = null;
		this.ClassNames = null;
		this.GlobalClassNames = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Class) && this.init)return this.init(...args);
	}
	init(name, _extends, body, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		if (_extends) {
			this.Extends = _extends;
		}
		if (body) {
			this.Body = body;
		}

		this.ClassNames = {
			Methods : [],
			StaticMethods : [],
			
			Variables : [],
			StaticVariables : [],
			
			Consts : [],
			Enums : [],
			
			Class : this
		};
	}


	GetCode(tabs, tabsin) {
		var exten,body,constru,methods,statics,others;
		this.TabsIn = tabs;
		if (this.Extends) {
			exten = " extends " + this.Extends.GetCode(0, tabsin);
		}
		else {
			exten = '';
		}


		if (this.Body) {
			constru = '';
			methods = '';
			statics = '';
			others = [];

			if (this.Extends) {
				constru += this.Tabs(tabs + 2) + 'super(...args);\n';
			}

			for (var i of this.Body) {
				if (i.Static || i.Type === 'Enum' || i.Type === 'Const') {
					while (others.length > 0) statics += others.shift().GetCode(tabs, tabsin) + '\n'

					if (i.Type === 'Function') {
						statics += this.Name.GetCode(tabs, tabsin) + '.';
					}
					statics += i.GetCode(0, tabsin) + ';\n';
				}
				else {
					if (i.Type === 'Var') {
						while (others.length > 0) constru += others.shift().GetCode(tabs + 2, tabsin + 2) + '\n'

						constru += i.GetCode(tabs + 2, tabsin + 2) + ';\n';
					}
					else {
						if ([
							'EmptyLine',
							'Comment'
						].includes(i.Type)) {
							others.push(i);
						}
						else {
							while (others.length > 0) methods += others.shift().GetCode(tabs + 1, tabsin + 1) + '\n'

							methods += i.GetCode(tabs + 1, tabsin + 1) + '\n';
						}
					}
				}
			}

			constru += this.Tabs(tabs + 2) + 'if(!(this.constructor.prototype instanceof ' + this.Name.GetCode(0, tabsin) + ') && this.init)return this.init(...args);\n';

			if (constru.length > 0) {
				constru = "\n" + (this.Tabs(tabs + 1, tabsin + 1)) + "constructor(...args) {\n" + (constru) + "" + (this.Tabs(tabs + 1, tabsin + 1)) + "}";
			}

			if (methods.length > 0) {
				methods = '\n' + (methods) + '';
			}
			if (statics.length > 0) {
				statics = '\n' + (statics) + '';
			}


			body = " {" + (constru) + "" + (methods) + "" + (methods.length > 0 || constru.length > 0? '\n' : '') + "" + (this.Tabs(tabs)) + "}" + (statics) + "";
		}
		else {
			body = ' {}';
		}

		return "" + (this.Tabs(tabs)) + "class " + (this.Name.GetCode(0, tabsin)) + "" + (exten) + "" + (body) + "";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Name.SetParent(this);
		if (this.Extends) {
			this.Extends.SetParent(this);
		}
		if (this.Body) {
			this.SetChildParents(this.Body);
		}
	}

	TransformAST(locals, classNames) {
		this.ClassNames.Document = classNames.Document;
		classNames.Classes[this.Name.Value] = this;
		this.GlobalClassNames = classNames;
		if (this.Body) {
			for (var i of this.Body) {
				switch( i.Type ) {
					case 'Enum': this.ClassNames.Enums.push(i.Name.Value); 	break;
					case 'Const': this.ClassNames.Consts.push(i.Name.Value); 	break;
					case 'Var': {
						if (i.Static) {
							this.ClassNames.StaticVariables.push(i.Name.Value);
						}
						else {
							this.ClassNames.Variables.push(i.Name.Value);
						}
					}; 	break;
					case 'Function': {
						if (i.Static) {
							this.ClassNames.StaticMethods.push(i.Name.Value);
						}
						else {
							this.ClassNames.Methods.push(i.Name.Value);
						}
					}; 	break;
				}
			}
		}

		this.Name.TransformAST(locals, classNames);
		if (this.Extends) {
			this.Extends.TransformAST(locals, classNames);
		}
		if (this.Body) {
			this.TransformASTInChild(this.Body, locals, this.ClassNames);
		}
	}

	GetProperty(name) {
		if ((this.ClassNames.Variables.includes(name)) || (this.ClassNames.Methods.includes(name))) {
			return {
				Static : false
			};
		}
		else {
			if ((this.ClassNames.StaticVariables.includes(name)) || (this.ClassNames.StaticMethods.includes(name)) || (this.ClassNames.Enums.includes(name)) || (this.ClassNames.Consts.includes(name))) {
				return {
					ClassName : this.Name.Value,
					Static : true
				};
			}
			else {
				if (this.Extends && this.GlobalClassNames.Classes[this.Extends.Value]) {
					return this.GlobalClassNames.Classes[this.Extends.Value].GetProperty(name);
				}
			}
		}
	}

	GetMappings() {
		var exten,clos,body,constru,methods,statics,cons,m,v,n,skipLine;
		if (this.Extends) {
			this.Loc[1].toCol = 9;
			exten = [
				this.Loc[1]
			].concat(this.Extends.GetMappings());

		}
		else {
			exten = [];
		}


		if (this.Body) {
			constru = [];
			methods = [];
			statics = [];

			if (this.Extends) {
				cons = this.CloneObj(this.Loc[0]);
				cons.toLine = 1;
				constru = [
					cons
				];

			}

			for (var i of this.Body) {
				if (i.Static || i.Type === 'Enum' || i.Type === 'Const') {
					if (i.Type === 'Function') {
						n = this.Name.GetMappings();
						n[0].toCol++;
						statics = statics.concat(n);

					}
					statics = statics.concat(i.GetMappings());
					statics[statics.length - 1].toLine++;

				}
				else {
					if (i.Type === 'Var') {
						v = i.GetMappings();
						v[v.length - 1].toLine++;
						constru = constru.concat(v);

					}
					else {
						m = i.GetMappings();
						m[m.length - 1].toLine++;
						methods = methods.concat(m);

					}
				}
			}



			skipLine = this.CloneObj(this.Loc[0]);
			skipLine.toLine = 1;


			constru = [
				this.CloneObj(skipLine)
			].concat(constru, [
				this.CloneObj(skipLine)
			]);



			body = [
				this.CloneObj(skipLine)
			].concat(constru, [
				this.CloneObj(skipLine)
			], methods, [
				this.CloneObj(skipLine)
			], [
				this.CloneObj(skipLine)
			], statics);

		}
		else {
			clos = this.CloneObj(this.Loc[0]);
			clos.toCol = 2;
			body = [
				clos
			];
		}

		this.Loc[0].col += this.TabsIn;
		this.Loc[0].toCol = 6;
		return [
			this.Loc[0]
		].concat(this.Name.GetMappings(), exten, body);

	}

	getASTAsString(tabs) {
		var h;
		h = tabs + 'Class';
		var i=0
		for (var c of this.Body) {
			h += '\n' + c.getASTAsString(tabs + '\t');
			i++;
		}

		return h;
	}

}

Funcs.Class = Class;

class Enum extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Values = null;
		this.Static = null;
		this.Access = null;
		if(!(this.constructor.prototype instanceof Enum) && this.init)return this.init(...args);
	}
	init(name, values, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		this.Values = values;
	}


	GetCode(tabs, tabsin) {
		var res,v;
		res = "" + (this.Name.GetCode(tabs, tabsin)) + " = {";
		for (var i in this.Values) {
			v = this.Values[i];
			if (i > 0) {
				res += ',';
			}
			res += "\n" + (v.GetCode(tabsin + 1, tabsin + 1)) + "";
		}
		res += "\n" + (this.Tabs(tabsin)) + "}";
		return res;
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Name.SetParent(this);
		this.SetChildParents(this.Values);
	}

	TransformAST(locals, classNames) {
		var i;
		i = 0;
		for (var v of this.Values) {
			if (v.Value != null) {
				i = parseInt(v.Value.Value);
			}
			else {
				v.Value = new Number(i, this.Name.Loc);
			}
			i++;
		}

		this.Name.TransformAST(this, classNames);
		this.TransformASTInChild(this.Values, classNames);
	}
	GetMappings() {
		var res,v,valMap;
		res = this.Name.GetMappings();
		res = res.concat([
			this.Loc[0]
		]);

		for (var i in this.Values) {
			v = this.Values[i];
			valMap = v.GetMappings();
			valMap[0].line++;
			res = res.concat(valMap);
		}

		this.Loc[1].line = 1;
		res = res.concat([
			this.Loc[1]
		]);

		return res;
	}

	getASTAsString(tabs) {
		var h;
		h = tabs + 'Enum';
		var i=0
		for (var c of this.Values) {
			h += '\n' + c.getASTAsString(tabs + '\t');
			i++;
		}

		return h;
	}

}


Funcs.Enum = Enum;

class EnumValue extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Value = null;
		if(!(this.constructor.prototype instanceof EnumValue) && this.init)return this.init(...args);
	}
	init(name, value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		return this.Tabs(tabs) + '"' + this.Name.GetCode(0, 0) + '" : ' + this.Value.GetCode(0, 0);
	}

	GetMappings() {
		return this.Name.GetMappings();
	}

	getASTAsString(tabs) {
		var h;
		h = tabs + 'EnumValue';

		return h;
	}

}

Funcs.EnumValue = EnumValue;

class Const extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Value = null;
		this.Static = null;
		this.Access = null;
		if(!(this.constructor.prototype instanceof Const) && this.init)return this.init(...args);
	}
	init(name, value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		if (this.Parent.Type === 'Class') {
			return this.Name.GetCode(tabs, tabsin) + ' = ' + this.Value.GetCode(0, tabsin);
		}
		else {
			return this.Tabs(tabs) + 'const ' + this.Name.GetCode(0, tabsin) + ' = ' + this.Value.GetCode(0, tabsin);
		}
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Name.SetParent(this);
		this.Value.SetParent(this);
	}

	TransformAST(locals, classNames) {
		this.Name.TransformAST(this, classNames);
		this.Value.TransformAST(this, classNames);
	}

	GetMappings() {
		var name;
		name = this.Name.GetMappings();
		if (Array.isArray(this.Loc)) {
			this.Loc[0].line = this.Loc[0].toLine = this.Loc[0].col = 0;
			this.Loc[0].toCol = 0;
			this.Loc[1].line = this.Loc[1].toLine = this.Loc[1].col = 0;
			this.Loc[1].toCol = 3;
			return [
				this.Loc[0]
			].concat(name, [
				this.Loc[1]
			], this.Value.GetMappings());
		}
		else {
			this.Loc.toCol += 2;
			return name.concat([
				this.Loc
			], this.Value.GetMappings());
		}
	}

	getASTAsString(tabs) {
		var h;
		h = tabs + 'Const';

		return h;
	}

}


Funcs.Const = Const;

class Reserved extends AstNode {
	constructor(...args) {
		super(...args);
		this.Value = null;
		if(!(this.constructor.prototype instanceof Reserved) && this.init)return this.init(...args);
	}
	init(value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		if (this.Loc) {
			this.Loc.col = tabs;
			this.Loc.toCol = this.Value.length;
		}
		return this.Tabs(tabs) + this.Value;
	}

}

Funcs.Reserved = Reserved;

class Number extends Reserved {
	constructor(...args) {
		super(...args);
		if(!(this.constructor.prototype instanceof Number) && this.init)return this.init(...args);
	}
	init(value, loc) {
		Reserved.prototype.init.call(this,value,loc);
	}

}
Funcs.Number = Number;

class _String extends Reserved {
	constructor(...args) {
		super(...args);
		if(!(this.constructor.prototype instanceof _String) && this.init)return this.init(...args);
	}
	init(value, loc) {
		Reserved.prototype.init.call(this,value,loc);
	}

}

Funcs.String = _String;

class This extends Reserved {
	constructor(...args) {
		super(...args);
		if(!(this.constructor.prototype instanceof This) && this.init)return this.init(...args);
	}
	init(value, loc) {
		Reserved.prototype.init.call(this,value,loc);
	}

}
Funcs.This = This;

class Op extends Reserved {
	constructor(...args) {
		super(...args);
		if(!(this.constructor.prototype instanceof Op) && this.init)return this.init(...args);
	}
	init(value, loc) {
		Reserved.prototype.init.call(this,value,loc);
	}

}
Funcs.Op = Op;

class Continue extends AstNode {
	constructor(...args) {
		super(...args);
		if(!(this.constructor.prototype instanceof Continue) && this.init)return this.init(...args);
	}
	GetCode(tabs, tabsin) {
		this.Loc.col = tabs;
		this.Loc.toCol = 8;
		return this.Tabs(tabs) + "continue";
	}

}

Funcs.Continue = Continue;

class Break extends AstNode {
	constructor(...args) {
		super(...args);
		if(!(this.constructor.prototype instanceof Break) && this.init)return this.init(...args);
	}
	GetCode(tabs, tabsin) {
		this.Loc.col = tabs;
		this.Loc.toCol = 5;
		return this.Tabs(tabs) + "break";
	}

}

Funcs.Break = Break;

class Tag extends AstNode {
	constructor(...args) {
		super(...args);
		this.Value = null;
		this.IsClassStatic = null;
		this.IsClassProp = null;
		this._ClassName = null;
		this._CanBeClassProperty = true;
		if(!(this.constructor.prototype instanceof Tag) && this.init)return this.init(...args);
	}
	init(value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Value = value;
		this.IsClassStatic = false;
		this.IsClassProp = false;
		this._ClassName = null;
	}

	GetCode(tabs, tabsin) {
		var val;
		if (this.IsClassProp) {
			if (this.IsClassStatic) {
				val = this._ClassName + '.' + this.Value;
			}
			else {
				val = 'this.' + this.Value;
			}
		}
		else {
			val = this.Value;
		}


		this.Loc.col += tabs;
		this.Loc.toCol = val.length;

		return this.Tabs(tabs) + val;
	}

	CanBeClassProperty() {
		if (!(this._CanBeClassProperty)) {
			return false;
		}

		if (this.Parent) {
			switch( this.Parent.Type ) {
				case 'Property': {
					if (this.Parent.Left !== this) {
						return false;
					}
				}; 	break;
				case 'Call': {
					if (this.Parent.Left === this && this.Parent.Parent && this.Parent.Parent.Type === 'Property' && this.Parent.Parent.Left !== this.Parent) {
						return false;
					}
				}; 	break;
				case 'Index': {
					if (this.Parent.Left === this && this.Parent.Parent && this.Parent.Parent.Type === 'Property' && this.Parent.Parent.Left !== this.Parent) {
						return false;
					}
				}; 	break;
				case 'Function': return false; 	break;
			}
		}
		return true;
	}

	GetLocalVars() {

		if (!this.IsClassProp  && this.Parent && this.Parent.Type === 'Assignament' && this.Parent.Op.Value === '=' && (this.Parent.Left === this || (this.Parent.Right === this && this.Parent.Parent && this.Parent.Parent.Type === 'Assignament' && this.Parent.Parent.Op.Value === '='))) {
			return [
				this.Value
			];
		}
		else {
			return [];
		}
	}

	TransformAST(locals, classNames) {
		var p;
		if (this.CanBeClassProperty()) {
			if (classNames.Class) {
				p = classNames.Class.GetProperty(this.Value);
				if (p) {
					if (p.Static) {
						this.IsClassProp = true;
						this.IsClassStatic = true;
						this._ClassName = p.ClassName;
					}
					else {
						if (!(classNames.Function && classNames.Function.HasParamRecursive(this.Value))) {
							this.IsClassProp = true;
						}
					}
				}
			}
		}
	}

}

Funcs.Tag = Tag;

class Var extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Value = null;
		this.Static = null;
		this.Access = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Var) && this.init)return this.init(...args);
	}
	init(name, value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		var res;
		this.TabsIn = tabs;

		res = this.Name.GetCode(tabs, tabsin) + ' = ';

		if (this.Value) {
			res += this.Value.GetCode(0, tabsin);
		}
		else {
			res += 'null';
		}
		return res;
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Name.SetParent(this);
		if (this.Value) {
			this.Value.SetParent(this);
		}
	}

	TransformAST(locals, classNames) {
		this.Name.TransformAST(this, classNames);
		if (this.Value) {
			this.Value.TransformAST(this, classNames);
		}
	}

	GetMappings() {
		var name;
		name = this.Name.GetMappings();
		if (this.Value) {
			if (Array.isArray(this.Loc)) {
				this.Loc[0].toCol = 0;
				this.Loc[1].toCol = 3;
				return [
					this.Loc[0]
				].concat(name, [
					this.Loc[1]
				], this.Value.GetMappings());
			}
			else {
				this.Loc.toCol += 2;
				return name.concat([
					this.Loc
				], this.Value.GetMappings());
			}
		}
		else {
			if (this.Loc) {
				this.Loc.toCol = 0;
				return [
					this.Loc
				].concat(name);
			}
			else {
				return name;
			}
		}
	}

}

Funcs.Var = Var;

class Function extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Params = null;
		this.Async = null;
		this.HasAwaits = null;
		this.OldStyle = null;
		this.Body = null;
		this.Getter = null;
		this.GetterL = null;
		this.Static = null;
		this.HasArgs = null;
		this.TabsIn = null;
		this.IsInternalAsync = null;
		if(!(this.constructor.prototype instanceof Function) && this.init)return this.init(...args);
	}
	init(name, params, asyn, oldStyle, body, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		this.Params = params;
		this.Async = asyn;
		this.HasAwaits = false;
		this.HasArgs = false;
		this.OldStyle = oldStyle;
		this.Body = body;
		this.Body.Inline = false;
		this.IsInternalAsync = false;
	}

	GetCode(tabs, tabsin) {
		var params,p,getter,head;
		this.TabsIn = tabs;

		if (this.Params) {
			params = '';
			for (var i in this.Params) {
				p = this.Params[i];
				if (i > 0) {
					params += ', ';
				}
				params += p.GetCode(0, tabsin);
			}
		}
		else {

			if (this.HasArgs) {
				params = '...args';
			}
			else {
				params = '';
			}
		}

		if (this.Getter) {
			getter = this.Getter + ' ';
		}
		else {
			getter = '';
		}

		if (this.Static) {
			if (this.OldStyle) {
				head = "function (" + (params) + ")";
			}
			else {
				head = "(" + (params) + ") =>";
			}
			return "" + (this.Name.GetCode(tabs, tabsin)) + " = " + (this.HasAwaits? 'async ' : '') + " " + (head) + " " + (this.Body.GetCode(tabs, tabsin)) + "";
		}
		else {
			if (this.OldStyle && this.Parent.Type !== 'Class') {
				head = "function (" + (params) + ")";
			}
			else {
				head = "(" + (params) + ") " + (((this.Name != null)? '' : '=> ')) + "";
			}
			return this.Tabs(tabs) + getter + (this.HasAwaits? 'async ' : '') + "" + ((this.Name != null? this.Name.GetCode(0, tabsin) : '')) + "" + (head) + "" + (this.Body.GetCode(tabs, tabsin)) + "";
		}
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		if (this.Name) {
			this.Name.SetParent(this);
		}
		if (this.Params) {
			this.SetChildParents(this.Params);
		}
		this.Body.SetParent(this);
	}

	TransformAST(locals, classNames) {
		var ParentFunc,inBlock,funcPar,inFunc,inCall,head,l,paramsLocals,myLocals,s,params,p;
		ParentFunc = classNames.Function;
		classNames.Function = this;
		if (this.Async) {
			inBlock = new Block(this.Body.Body, true, (this.CloneObj(this.Body.Loc)));
			funcPar = new FunctionParam('ce', null, (this.CloneObj(this.Loc)));
			inFunc = new Function(null, [
				(new FunctionParam('cb', null, (this.CloneObj(this.Loc)))),
				funcPar
			], false, false, inBlock, (this.CloneObj(this.Loc)));
			inFunc.IsInternalAsync = true;
			inCall = new Call((new Tag('Promise', (this.CloneObj(this.Loc)))), [
				[
					inFunc,
					(this.CloneObj(this.Loc))
				]
			], [
				(this.CloneObj(this.Loc)),
				(this.CloneObj(this.Loc))
			]);

			head = new Return((new New(inCall, (this.CloneObj(this.Loc)))), (this.CloneObj(this.Loc)));
			this.Body.Body = [
				head
			];

			head.SetParent(this.Body);
		}

		l = this.Body.GetLocalVars();

		paramsLocals = [];
		if (this.Params) {
			for (var p of this.Params) paramsLocals.push(p.Name)
		}

		myLocals = [];
		for (var c of l) {
			if (!((paramsLocals.includes(c)) || (classNames.Class && classNames.Class.GetProperty(c)) || (locals.includes(c)))) {
				myLocals.push(c);
			}
		}

		if (myLocals.length > 0) {
			this.Body.Body.unshift(new LocalVar(myLocals));
		}

		if (this.Name) {
			this.Name.TransformAST(locals, classNames);
		}
		if (this.Params) {
			this.TransformASTInChild(this.Params, classNames);
		}
		this.Body.TransformAST(locals.concat(myLocals, paramsLocals), classNames);

		if (this.Parent.Type === 'Class') {

			if (classNames.Class.Extends && this.Name.Value === 'constructor') {
				s = new Super([]);
				this.Body.Body.unshift(s);
				s.SetParent(this);
				s.TransformAST(locals, classNames);
			}
		}

		if (this.HasAwaits) {
			if (this.IsInternalAsync) {
				throw "function cannot have async calls and be of type '-->' on line " + (this.Loc.firstLine) + " column " + (this.Loc.firstCol) + "";
			}

			if (this.Params) {
				params = '';
				for (var i in this.Params) {
					p = this.Params[i];
					if (i > 0) {
						params += ', ';
					}
					params += p.Name;
				}
			}











		}

		classNames.Function = ParentFunc;
	}

	GetMappings() {
		var params,args,p,com,getter,start,paren,head,func,funstart,funend,eq;
		params = [];
		if (this.Params) {
			for (var i in this.Params) {
				p = this.Params[i];
				if (i > 0) {
					com = this.CloneObj(this.Loc);
					com.toCol = 2;
					params = params.concat([
						com
					]);

				}
				params = params.concat(p.GetMappings());

			}
		}
		else {
			if (this.HasAwaits || this.HasArgs) {
				args = this.CloneObj(this.Loc);
				args.toCol = 7;
				params = params.concat([
					args
				]);

			}
		}

		if (this.Getter) {
			getter = this.CloneObj(this.Loc);
			getter.toCol = 4;
			getter = [
				getter
			];

		}
		else {
			getter = [];
		}

		if (this.Static) {
			if (this.OldStyle) {
				funstart = this.CloneObj(this.Loc);
				funstart.toCol = 10;
				funend = this.CloneObj(this.Loc);
				funend.toCol = 1;
				head = [
					funstart
				].concat(params, [
					funend
				]);

			}
			else {
				funstart = this.CloneObj(this.Loc);
				funstart.toCol = 1;
				funend = this.CloneObj(this.Loc);
				funend.toCol = 4;
				head = [
					funstart
				].concat(params, [
					funend
				]);

			}
			eq = this.CloneObj(this.Loc);
			eq.toCol = 3;

			return this.Name.GetMappings().concat([
				eq
			], head, this.Body.GetMappings());

		}
		else {
			if (this.OldStyle && this.Parent.Type !== 'Class') {
				func = this.CloneObj(this.Loc);
				func.toCol = 10;
				head = [
					func
				].concat(params, [
					this.CloneObj(this.Loc)
				]);

			}
			else {
				start = this.CloneObj(this.Loc);
				start.toCol = 3;
				paren = this.CloneObj(this.Loc);
				paren.toCol = 2;
				head = [
					this.CloneObj(this.Loc)
				].concat(params, [
					paren
				], (this.Name? [] : [
					start
				]));

			}
			this.Loc.col = this.TabsIn;
			this.Loc.toCol = 0;
			return [
				this.Loc
			].concat(getter, (this.Name != null? this.Name.GetMappings() : []), head, this.Body.GetMappings());

		}

		return res;
	}

	HasParam(name) {
		if (this.Params) {
			for (var p of this.Params) {
				if (p.Name === name) {
					return true;
				}
			}
		}
		return false;
	}

	HasParamRecursive(name) {
		var p;
		if (this.HasParam(name)) {
			return true;
		}

		p = this.Parent;
		while (p) {
			if (p instanceof Function) {
				if (p.HasParamRecursive(name)) {
					return true;
				}
			}
			p = p.Parent;
		}
		return false;
	}

}


Funcs.Function = Function;


class FunctionParam extends AstNode {
	constructor(...args) {
		super(...args);
		this.Name = null;
		this.Value = null;
		if(!(this.constructor.prototype instanceof FunctionParam) && this.init)return this.init(...args);
	}
	init(name, value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Name = name;
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		if (this.Value) {
			return this.Name + '=' + this.Value.GetCode(0, tabsin);
		}
		else {
			return this.Name;
		}
	}
	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		if (this.Value) {
			this.Value.SetParent(this);
		}
	}

	TransformAST(locals, classNames) {
		if (this.Value) {
			this.Value.TransformAST(locals, classNames);
		}
	}

	GetMappings() {
		if (this.Value) {
			if (this.Loc.length === 3) {
				this.Loc[0].toCol++;
				this.Loc[1].toCol = this.Name.length;
			}
			else {
				this.Loc[0].toCol = this.Name.length;
			}
			return this.Loc.concat(this.Value.GetMappings());
		}
		else {
			if (Array.isArray(this.Loc)) {
				this.Loc[0].toCol++;
				this.Loc[1].toCol = this.Name.length;
				return this.Loc;
			}
			else {
				this.Loc.toCol = this.Name.length;
				return [
					this.Loc
				];
			}
		}
	}

}

Funcs.FunctionParam = FunctionParam;


class Await extends AstNode {
	constructor(...args) {
		super(...args);
		this.Exp = null;
		if(!(this.constructor.prototype instanceof Await) && this.init)return this.init(...args);
	}
	init(exp, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Exp = exp;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col = tabs;
		this.Loc.toCol = 6;

		return this.Tabs(tabs) + 'await ' + this.Exp.GetCode(0, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Exp.SetParent(this);
	}

	TransformAST(locals, classNames) {
		if (classNames.Function) {
			classNames.Function.HasAwaits = true;
		}
		else {
			classNames.Document.HasAwaits = true;
		}

		this.Exp.TransformAST(locals, classNames);
	}

	GetMappings() {
		return [
			this.Loc
		].concat(this.Exp.GetMappings());
	}

}

Funcs.Await = Await;


class Operation extends AstNode {
	constructor(...args) {
		super(...args);
		this.A = null;
		this.B = null;
		this.C = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Operation) && this.init)return this.init(...args);
	}
	init(a, b, c, loc) {
		AstNode.prototype.init.call(this,loc);

		this.A = a;
		this.B = b;
		this.C = c;
	}

	GetCode(tabs, tabsin) {
		var a,spc,b,c;
		this.TabsIn = tabs;

		a = this.A.GetCode(0, tabsin);

		spc = '';
		if (!(this.A.Type === 'Op' && ([
			'++',
			'--',
			'+',
			'-',
			'~',
			'!'
		].includes(this.A.Value)))) {
			spc += ' ';
		}

		if ((this.B.Type === 'Op' && !([
			'++',
			'--'
		].includes(this.B.Value)) ) || this.C || this.B.Type !== 'Op') {
			b = spc + this.B.GetCode(0, tabsin) + ((spc.length === 0)? '' : ' ');
		}
		else {

			b = this.B.GetCode(0, tabsin);
		}

		if (this.C) {
			c = this.C.GetCode(0, tabsin);
		}
		else {
			c = '';
		}

		return this.Tabs(tabs) + a + b + c;
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.A.SetParent(this);
		this.B.SetParent(this);
		if (this.C) {
			this.C.SetParent(this);
		}
	}

	GetLocalVars() {
		var res;
		res = this.A.GetLocalVars();
		res = res.concat(this.B.GetLocalVars());
		if (this.C) {
			res = res.concat(this.C.GetLocalVars());
		}
		return res;
	}

	TransformAST(locals, classNames) {
		this.A.TransformAST(locals, classNames);
		this.B.TransformAST(locals, classNames);
		if (this.C) {
			this.C.TransformAST(locals, classNames);
		}
	}

	GetMappings() {
		var a,b,res,c;
		a = this.A.GetMappings();


		b = this.B.GetMappings();

		b[b.length - 1].toCol += 2;

		if (this.C) {
			c = this.C.GetMappings();

			res = a.concat(b.concat(c));
		}
		else {
			res = a.concat(b);
		}

		res[0].col += this.TabsIn;
		return res;
	}

	getASTAsString(tabs) {
		var h;
		h = AstNode.prototype.getASTAsString.call(this,tabs);
		h += '\n' + this.A.getASTAsString(tabs + '\t');
		h += '\n' + this.B.getASTAsString(tabs + '\t');
		if (this.C) {
			h += '\n' + this.C.getASTAsString(tabs + '\t');
		}

		return h;
	}

}


Funcs.Operation = Operation;

class In extends AstNode {
	constructor(...args) {
		super(...args);
		this.Left = null;
		this.Right = null;
		if(!(this.constructor.prototype instanceof In) && this.init)return this.init(...args);
	}
	init(left, right, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Left = left;
		this.Right = right;
	}

	GetCode(tabs, tabsin) {
		return this.Tabs(tabs) + "" + (this.Right.GetCode(0, tabsin)) + ".includes(" + (this.Left.GetCode(0, tabsin)) + ")";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Left.SetParent(this);
		this.Right.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Left.GetLocalVars();
		return res.concat(this.Right.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Left.TransformAST(locals, classNames);
		this.Right.TransformAST(locals, classNames);
	}

	GetMappings() {
		var left,index,right,endindex;
		left = this.Left.GetMappings();
		index = this.CloneObj(this.Loc);
		index.toCol += 8;
		right = this.Right.GetMappings();
		endindex = this.Loc;
		endindex.toCol += 6;

		this.Loc = right.concat([
			index
		], left, [
			endindex
		]);

		return this.Loc;
	}

}

Funcs.In = In;

class New extends AstNode {
	constructor(...args) {
		super(...args);
		this.Child = null;
		if(!(this.constructor.prototype instanceof New) && this.init)return this.init(...args);
	}
	init(child, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Child = child;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col = tabs;
		this.Loc.toCol = 4;

		return this.Tabs(tabs) + 'new ' + this.Child.GetCode(0, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Child.SetParent(this);
	}

	GetLocalVars() {
		return this.Child.GetLocalVars();
	}

	TransformAST(locals, classNames) {
		this.Child.TransformAST(locals, classNames);
	}

	GetMappings() {
		var child;
		child = this.Child.GetMappings();

		return [
			this.Loc
		].concat(child);
	}

}

Funcs.New = New;

class Super extends AstNode {
	constructor(...args) {
		super(...args);
		this.Params = null;
		this.SuperParams = null;
		this.Name = null;
		this.TabsIn = null;
		this.LocCommas = null;
		if(!(this.constructor.prototype instanceof Super) && this.init)return this.init(...args);
	}
	init(params, loc) {
		var p;
		AstNode.prototype.init.call(this,loc);

		this.Params = [];
		this.LocCommas = [];
		var i=0
		for (var k in params) {
			p = params[k];
			this.Params.push(p[0]);
			if (i > 0) {
				p[1].col = p[1].toLine = p[1].line = 0;
				p[1].toCol = 1;
				this.LocCommas.push(p[1]);
			}
			i++;
		}
	}

	GetCode(tabs, tabsin) {
		var params,p;
		this.TabsIn = tabs;
		params = '';

		if (this.Params.length > 0) {
			var i=0
			for (var k in this.Params) {
				p = this.Params[k];
				params += ',';
				params += p.GetCode(0, tabsin);
				i++;
			}
		}
		else {
			if (this.SuperParams) {
				var i=0
				for (var k in this.SuperParams) {
					p = this.SuperParams[k];
					params += ',';
					params += p;
					i++;
				}
			}
		}

		if (params.length > 0) {
			return this.Tabs(tabs) + this.Name + '.call(this' + params + ')';
		}
		else {
			return this.Tabs(tabs) + this.Name + '.apply(this,...args)';
		}
	}


	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		if (this.Params.length > 0) {
			this.SetChildParents(this.Params);
		}
	}

	GetLocalVars() {
		if (this.Params.length > 0) {
			return this.GetChildLocalVars(this.Params);
		}
		else {
			return [];
		}
	}

	TransformAST(locals, classNames) {
		var FunctionClass,parent;
		FunctionClass = this.Parent;
		parent = this.Parent;
		while (parent && parent.Type !== 'Class') {
			FunctionClass = parent;
			parent = parent.Parent;
		}

		if (FunctionClass.Params === null && this.Params.length === 0) {
			FunctionClass.HasArgs = true;
		}

		if (classNames.Class && classNames.Class.Extends) {
			this.Name = classNames.Class.Extends.Value + '.prototype.' + FunctionClass.Name.Value;
		}
		else {
			this.Name = 'Object.prototype.' + FunctionClass.Name.Value;
		}

		if (this.Params.length === 0 && FunctionClass.Params) {
			this.SuperParams = [];
			for (var p of FunctionClass.Params) this.SuperParams.push(p.Name)
		}

		if (this.Params.length > 0) {
			this.TransformASTInChild(this.Params, locals, classNames);
		}
	}

	GetMappings() {
		var params,par,p,nam;
		params = [];

		if (this.Params.length > 0) {
			var i=0
			for (var k in this.Params) {
				p = this.Params[k];
				if (i > 0) {
					params.push(this.LocCommas[i - 1]);
				}
				params = params.concat(p.GetMappings());
				i++;
			}
		}
		else {
			if (this.SuperParams) {
				par = this.CloneObj(this.Loc[0]);
				for (var p of this.SuperParams) par.toCol += 2 + p.length
				params.push(par);
			}
		}

		nam = this.CloneObj(this.Loc[0]);
		nam.col += this.TabsIn;
		if (params.length > 0) {
			nam.toCol = this.Name.length + 11;

		}
		else {
			nam.toCol = this.Name.length + 20;

		}
		return [
			nam
		].concat(params, [
			this.Loc[2]
		]);
	}

}

Funcs.Super = Super;

class If extends AstNode {
	constructor(...args) {
		super(...args);
		this.Positive = null;
		this.Condition = null;
		this.Body = null;
		this.Else = null;
		if(!(this.constructor.prototype instanceof If) && this.init)return this.init(...args);
	}
	init(positive, condition, body, _else, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Positive = positive;
		this.Condition = condition;
		this.Body = body;
		this.Else = _else;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col += tabs;

		return "" + (this.Tabs(tabs)) + "if (" + ((this.Positive? '' : '!(')) + "" + (this.Condition.GetCode(0, tabsin)) + "" + ((this.Positive? '' : ')')) + ") " + (this.Body.GetCode(tabs, tabsin)) + "" + ((this.Else? '\n' + this.Else.GetCode(tabs, tabsin) : '')) + "";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Condition.SetParent(this);
		if (this.Else) {
			this.Else.SetParent(this);
		}
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Condition.GetLocalVars();
		if (this.Else) {
			res = res.concat(this.Else.GetLocalVars());
		}
		return res.concat(this.Body.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Condition.TransformAST(locals, classNames);
		if (this.Else) {
			this.Else.TransformAST(locals, classNames);
		}
		this.Body.TransformAST(locals, classNames);
	}

	GetMappings() {
		this.Loc.toCol += this.Positive? 3 : 5;
		return [
			this.Loc
		].concat(this.Condition.GetMappings(), this.Body.GetMappings(), (this.Else? this.Else.GetMappings() : []));
	}

}

Funcs.If = If;

class Else extends AstNode {
	constructor(...args) {
		super(...args);
		this.Body = null;
		if(!(this.constructor.prototype instanceof Else) && this.init)return this.init(...args);
	}
	init(body, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Body = body;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col += tabs;

		return "" + (this.Tabs(tabs)) + "else " + (this.Body.GetCode(tabs, tabsin)) + "";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		return this.Body.GetLocalVars();
	}

	TransformAST(locals, classNames) {
		this.Body.TransformAST(locals, classNames);
	}
	GetMappings() {
		this.Loc.line++;
		this.Loc.toCol = 4;
		return [
			this.Loc
		].concat(this.Body.GetMappings());
	}

}

Funcs.Else = Else;

class InlineIf extends AstNode {
	constructor(...args) {
		super(...args);
		this.Condition = null;
		this.Positive = null;
		this.Negative = null;
		if(!(this.constructor.prototype instanceof InlineIf) && this.init)return this.init(...args);
	}
	init(condition, positive, negative, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Condition = condition;
		this.Positive = positive;
		this.Negative = negative;
	}

	GetCode(tabs, tabsin) {
		return this.Condition.GetCode(tabs, tabsin) + '? ' + this.Positive.GetCode(0, tabsin) + ' : ' + this.Negative.GetCode(0, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Condition.SetParent(this);
		this.Positive.SetParent(this);
		this.Negative.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Condition.GetLocalVars();
		res = res.concat(this.Positive.GetLocalVars());
		res = res.concat(this.Negative.GetLocalVars());
		return res;
	}

	TransformAST(locals, classNames) {
		this.Condition.TransformAST(locals, classNames);
		this.Positive.TransformAST(locals, classNames);
		this.Negative.TransformAST(locals, classNames);
	}

	GetMappings() {
		this.Loc[0].toCol = 2;
		this.Loc[1].toCol = 3;
		return this.Condition.GetMappings().concat([
			this.Loc[0]
		], this.Positive.GetMappings(), [
			this.Loc[1]
		], this.Negative.GetMappings());
	}

}

Funcs.InlineIf = InlineIf;

class Do extends AstNode {
	constructor(...args) {
		super(...args);
		this.Condition = null;
		this.Body = null;
		if(!(this.constructor.prototype instanceof Do) && this.init)return this.init(...args);
	}
	init(body, condition, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Condition = condition;
		this.Body = body;
	}

	GetCode(tabs, tabsin) {
		this.Loc[0].col += tabs;
		return this.Tabs(tabs) + 'do ' + this.Body.GetCode(tabs, tabsin) + ' while (' + this.Condition.GetCode(0, tabsin) + ')';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Condition.SetParent(this);
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Condition.GetLocalVars();
		return res.concat(this.Body.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Condition.TransformAST(locals, classNames);
		this.Body.TransformAST(locals, classNames);
	}

	GetMappings() {
		var end;
		this.Loc[0].toCol = 3;
		end = this.CloneObj(this.Loc[1]);
		this.Loc[1].col++;
		this.Loc[1].toCol = 7;
		return [
			this.Loc[0]
		].concat(this.Body.GetMappings(), [
			this.Loc[1]
		], this.Condition.GetMappings(), [
			end
		]);
	}

}

Funcs.Do = Do;

class While extends AstNode {
	constructor(...args) {
		super(...args);
		this.Condition = null;
		this.Body = null;
		if(!(this.constructor.prototype instanceof While) && this.init)return this.init(...args);
	}
	init(condition, body, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Condition = condition;
		this.Body = body;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col += tabs;
		return this.Tabs(tabs) + 'while (' + this.Condition.GetCode(0, tabsin) + ') ' + this.Body.GetCode(tabs, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Condition.SetParent(this);
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Condition.GetLocalVars();
		res = res.concat(this.Body.GetLocalVars());
		return res;
	}

	TransformAST(locals, classNames) {
		this.Condition.TransformAST(locals, classNames);
		this.Body.TransformAST(locals, classNames);
	}

	GetMappings() {
		var end;
		end = this.CloneObj(this.Loc);
		end.col = 0;
		end.toCol = 2;

		this.Loc.toCol = 7;
		return [
			this.Loc
		].concat(this.Condition.GetMappings(), [
			end
		], this.Body.GetMappings());
	}

}

Funcs.While = While;

class For extends AstNode {
	constructor(...args) {
		super(...args);
		this.Value = null;
		this.Key = null;
		this.Counter = null;
		this.Collection = null;
		this.Body = null;
		if(!(this.constructor.prototype instanceof For) && this.init)return this.init(...args);
	}
	init(value, key, counter, collection, body, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Value = value;
		this.Key = key;
		this.Counter = counter;
		this.Collection = collection;
		this.Body = body;

		if (this.Key && this.Value) {

			this.Body.Body.unshift(new Assignament((new Tag(this.Value.Value, (this.CloneObj(this.Value.Loc)))), (new Op('=', (this.CloneObj(this.Loc)))), (new Index(this.Collection, (new Tag(this.Key.Value, (this.CloneObj(this.Key.Loc)))), [
				(this.CloneObj(this.Loc)),
				(this.CloneObj(this.Loc))
			]))));
		}
		if (this.Counter) {
			this.Body.Body.push(new Operation((new Tag(this.Counter.Value, (this.CloneObj(this.Counter.Loc)))), (new Op('++', (this.CloneObj(this.Loc))))));
		}
	}

	GetCode(tabs, tabsin) {
		var c;
		this.Loc.col += tabs;

		if (this.Counter) {
			c = this.Tabs(tabs) + 'var ' + this.Counter.Value + "=0\n";
		}
		else {
			c = '';
		}

		if (this.Key || !this.Value ) {
			return c + this.Tabs(tabs) + 'for (var ' + (this.Key? this.Key.GetCode(0, tabsin) : '_r') + ' in ' + this.Collection.GetCode(0, tabsin) + ') ' + this.Body.GetCode(tabs, tabsin);
		}
		else {
			return c + this.Tabs(tabs) + 'for (var ' + this.Value.GetCode(0, tabsin) + ' of ' + this.Collection.GetCode(0, tabsin) + ') ' + this.Body.GetCode(tabs, tabsin);
		}
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		if (this.Value) {
			this.Value.SetParent(this);
		}
		if (this.Key) {
			this.Key.SetParent(this);
		}
		if (this.Counter) {
			this.Counter.SetParent(this);
		}
		this.Collection.SetParent(this);
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = [];
		res = res.concat(this.Collection.GetLocalVars());
		res = res.concat(this.Body.GetLocalVars());
		return res;
	}

	TransformAST(locals, classNames) {
		if (this.Value) {
			this.Value.TransformAST(locals, classNames);
		}
		if (this.Key) {
			this.Key.TransformAST(locals, classNames);
		}
		if (this.Counter) {
			this.Counter.TransformAST(locals, classNames);
		}
		this.Collection.TransformAST(locals, classNames);
		this.Body.TransformAST(locals, classNames);
	}

	GetMappings() {
		var c,skipLine,off,par,inn;
		this.Loc.toCol = 9;
		if (this.Counter) {
			skipLine = this.CloneObj(this.Loc);
			skipLine.toCol = 0;
			skipLine.toLine = 1;
			c = [
				skipLine
			];

		}
		else {
			c = [];
		}

		if (this.Key || !this.Value ) {
			if (!(this.Key)) {
				this.Loc.toCol += 2;
			}
			inn = this.CloneObj(this.Loc);
			inn.col = 0;
			inn.toCol = 4;
			par = this.CloneObj(inn);
			par.toCol = 2;
			return c.concat([
				this.Loc
			], (this.Key? this.Key.GetMappings() : []), [
				inn
			], this.Collection.GetMappings(), [
				par
			], this.Body.GetMappings());

		}
		else {
			off = this.CloneObj(this.Loc);
			off.col = 0;
			off.toCol = 4;
			par = this.CloneObj(off);
			par.toCol = 2;
			return c.concat([
				this.Loc
			], this.Value.GetMappings(), [
				off
			], this.Collection.GetMappings(), [
				par
			], this.Body.GetMappings());

		}
	}

}


Funcs.For = For;


class ForRange extends AstNode {
	constructor(...args) {
		super(...args);
		this.Key = null;
		this.Inclusive = null;
		this.From = null;
		this.To = null;
		this.Body = null;
		this.Step = null;
		this.StepType = null;
		this.NumberRanges = null;
		if(!(this.constructor.prototype instanceof ForRange) && this.init)return this.init(...args);
	}
	init(key, inclusive, _from, to, step, body, loc) {
		var __v;
		AstNode.prototype.init.call(this,loc);
		this.Key = (typeof key !== 'undefined' && key !== null) ? key : new Tag('_o', loc);
		this.Inclusive = inclusive;
		this.From = _from;
		this.To = to;
		this.Body = body;
		this.Step = step;
	}

	GetCode(tabs, tabsin) {
		var _from,to,key,f,t,end,stepcode,s,step;
		this.Loc.col += tabs;

		_from = this.From.GetCode(0, tabsin);
		to = this.To.GetCode(0, tabsin);
		key = this.Key.GetCode(0, tabsin);

		f = parseInt(_from);
		t = parseInt(to);

		if (isNaN(f) || isNaN(t)) {
			this.NumberRanges = false;
			if (this.Inclusive) {
				end = "" + (_from) + "<" + (to) + "? " + (key) + "<=" + (to) + " : " + (key) + ">=" + (to) + "";
			}
			else {
				end = "" + (_from) + "<" + (to) + "? " + (key) + "<" + (to) + " : " + (key) + ">" + (to) + "";
			}
		}
		else {
			this.NumberRanges = true;
			if (this.Inclusive) {
				if (f < t) {
					end = "" + (key) + "<= " + (to) + "";
				}
				else {
					end = "" + (key) + ">= " + (to) + "";
				}
			}
			else {
				if (f < t) {
					end = "" + (key) + "< " + (to) + "";
				}
				else {
					end = "" + (key) + "> " + (to) + "";
				}
			}
		}


		if (this.Step) {
			stepcode = this.Step.GetCode(0, tabsin);
		}

		s = parseInt(stepcode);

		if (s === 1) {
			this.StepType = ForRange.STEP_TYPES.POSITIVE;
			step = key + '++';
		}
		else {
			if (s === -1 ) {
				this.StepType = ForRange.STEP_TYPES.NEGATIVE;
				step = key + '--';
			}
			else {
				if (isNaN(s)) {
					this.StepType = ForRange.STEP_TYPES.UNKNOWN;
					step = "" + (_from) + "<" + (to) + "? " + (key) + "+= " + (this.Step? this.Step.GetCode(0, tabsin) : 1) + " : " + (key) + "-= " + (this.Step? this.Step.GetCode(0, tabsin) : 1) + "";
				}
				else {
					this.StepType = ForRange.STEP_TYPES.NUMBER;
					step = "" + (key) + "+= " + (stepcode) + "";
				}
			}
		}


		return "" + (this.Tabs(tabs)) + "for (var " + (key) + " = " + (_from) + " ; " + (end) + " ; " + (step) + " ) " + (this.Body.GetCode(tabs, tabsin)) + "";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Key.SetParent(this);
		this.From.SetParent(this);
		this.To.SetParent(this);
		if (this.Step) {
			this.Step.SetParent(this);
		}
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.From.GetLocalVars();
		res = res.concat(this.To.GetLocalVars());
		if (this.Step) {
			res = res.concat(this.Step.GetLocalVars());
		}
		res = res.concat(this.Body.GetLocalVars());
		return res;
	}

	TransformAST(locals, classNames) {
		this.Key.TransformAST(locals, classNames);
		this.From.TransformAST(locals, classNames);
		this.To.TransformAST(locals, classNames);
		if (this.Step) {
			this.Step.TransformAST(locals, classNames);
		}
		this.Body.TransformAST(locals, classNames);
	}

	GetMappings() {
		var _from,to,key,skip1,skip2,skip3,end,stepcode,step;
		_from = this.From.GetMappings();
		to = this.To.GetMappings();
		key = this.Key.GetMappings();

		skip1 = this.CloneObj(this.Loc);
		skip1.col = 0;
		skip2 = this.CloneObj(skip1);
		skip2.toCol++;

		skip3 = this.CloneObj(skip2);
		skip3.toCol++;

		if (!(this.NumberRanges)) {
			if (this.Inclusive) {
				end = _from.concat([
					(this.CloneObj(skip1))
				], to, [
					(this.CloneObj(skip2))
				], key, [
					(this.CloneObj(skip2))
				], to, [
					(this.CloneObj(skip3))
				], key, [
					(this.CloneObj(skip2))
				], to);
			}
			else {
				end = _from.concat([
					(this.CloneObj(skip1))
				], to, [
					(this.CloneObj(skip2))
				], key, [
					(this.CloneObj(skip1))
				], to, [
					(this.CloneObj(skip3))
				], key, [
					(this.CloneObj(skip1))
				], to);
			}
		}
		else {
			if (this.Inclusive) {
				end = key.concat([
					(this.CloneObj(skip3))
				], to);




			}
			else {
				end = key.concat([
					(this.CloneObj(skip2))
				], to);




			}
		}



		if (this.Step) {
			stepcode = this.Step.GetMappings();
		}

		switch( this.StepType ) {
			case ForRange.STEP_TYPES.POSITIVE: 
			case ForRange.STEP_TYPES.NEGATIVE: step = key.concat([
				(this.CloneObj(skip2))
			]); 	break;
			case ForRange.STEP_TYPES.NUMBER: step = key.concat([
				(this.CloneObj(skip3))
			], stepcode); 	break;
			case ForRange.STEP_TYPES.UNKNOWN: step = _from.concat([
				(this.CloneObj(skip1))
			], to, [
				(this.CloneObj(skip2))
			], key, [
				(this.CloneObj(skip3))
			], (this.Step? this.Step.GetMappings() : [
				(this.CloneObj(skip1))
			]), [
				(this.CloneObj(skip3))
			], key, [
				(this.CloneObj(skip3))
			], (this.Step? this.Step.GetMappings() : [
				(this.CloneObj(skip1))
			])); 	break;
		}

		this.Loc.toCol = 9;
		return [
			this.Loc
		].concat(key, [
			(this.CloneObj(skip3))
		], _from, [
			(this.CloneObj(skip3))
		], end, [
			(this.CloneObj(skip3))
		], step, [
			(this.CloneObj(skip3))
		], this.Body.GetMappings());
	}

}
ForRange.STEP_TYPES = {
	"POSITIVE" : 0,
	"NEGATIVE" : 1,
	"NUMBER" : 2,
	"UNKNOWN" : 3
};



Funcs.ForRange = ForRange;

class Switch extends AstNode {
	constructor(...args) {
		super(...args);
		this.Condition = null;
		this.Cases = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Switch) && this.init)return this.init(...args);
	}
	init(condition, cases, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Condition = condition;
		this.Cases = cases;
	}

	GetCode(tabs, tabsin) {
		var cases;
		this.TabsIn = tabs;
		cases = '';

		for (var opt of this.Cases) {
			if (Array.isArray(opt)) {
				if (opt.length === 1) {
					cases += '\n' + this.Tabs(tabs + 1) + 'default: ' + opt[0].GetCode(0, tabsin + 1);
				}
				else {
					for (var exp of opt[0]) cases += '\n' + this.Tabs(tabs + 1) + 'case ' + (exp.GetCode(0, tabsin)) + ": "

					cases += opt[1].GetCode(0, tabsin + 1);
					if (opt[1].Body.length <= 1) {
						cases += '; \tbreak;';
					}
					else {
						cases += '\n' + this.Tabs(tabs + 2) + 'break;';
					}
				}
			}
			else {
				cases += '\n' + opt.GetCode(tabs + 1, tabsin + 1);
			}
		}


		return this.Tabs(tabs) + 'switch( ' + this.Condition.GetCode(0, tabsin) + ' ) {' + cases + '\n' + this.Tabs(tabs) + '}';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Condition.SetParent(this);

		for (var c of this.Cases) {
			if (Array.isArray(c)) {
				if (c[1]) {
					c[1].SetParent(this);

					this.SetChildParents(c[0]);
				}
				else {
					c[0].SetParent(this);
				}
			}
			else {
				c.SetParent(this);
			}
		}
	}

	GetLocalVars() {
		var res;
		res = this.Condition.GetLocalVars();

		for (var c of this.Cases) {
			if (Array.isArray(c)) {
				if (c[1]) {
					res = res.concat(c[1].GetLocalVars());
					res = res.concat(this.GetChildLocalVars(c[0]));
				}
				else {
					res = res.concat(c[0].GetLocalVars());
				}
			}
			else {
				res = res.concat(c.GetLocalVars());
			}
		}

		return res;
	}

	TransformAST(locals, classNames) {
		AstNode.prototype.TransformAST.call(this,locals,classNames);
		this.Condition.TransformAST(locals, classNames);

		for (var c of this.Cases) {
			if (Array.isArray(c)) {
				if (c[1]) {
					c[1].TransformAST(locals, classNames);

					this.TransformASTInChild(c[0], locals, classNames);
				}
				else {
					c[0].TransformAST(locals, classNames);
				}
			}
			else {
				c.TransformAST(locals, classNames);
			}
		}
	}

	GetMappings() {
		var cases,skipTab,skipTab2,cas,col,brea,def;
		cases = [];

		skipTab = this.CloneObj(this.Loc[0]);
		skipTab.line = 1;
		skipTab.toCol = this.TabsIn + 1;
		skipTab2 = this.CloneObj(skipTab);
		skipTab2.toCol++;

		cases = [];

		for (var opt of this.Cases) {
			if (Array.isArray(opt)) {
				if (opt.length === 1) {
					def = this.CloneObj(skipTab);
					def.toCol = 9;
					cases = cases.concat([
						def
					], opt[0].GetMappings());

				}
				else {
					for (var exp of opt[0]) {
						cas = this.CloneObj(skipTab);
						cas.toCol = 6;
						col = this.CloneObj(this.Loc[0]);
						col.toCol = 2;
						cases = cases.concat([
							cas
						], exp.GetMappings(), [
							col
						]);

					}

					cases = cases.concat(opt[1].GetMappings());

					if (opt[1].Body.length <= 1) {
						brea = this.CloneObj(this.Loc[0]);
						brea.toCol = 10;
						cases = cases.concat([
							brea
						]);

					}
					else {
						skipTab2.toCol += 6;
						cases = cases.concat([
							skipTab2
						]);

					}
				}
			}
			else {
				cases = cases.concat(opt.GetMappings());
			}
		}

		this.Loc[0].col += this.TabsIn;
		this.Loc[0].toCol = 8;
		this.Loc[1].toCol = 3;
		this.Loc[2].line++;
		return [
			this.Loc[0]
		].concat(this.Condition.GetMappings(), [
			this.Loc[1]
		], cases, [
			this.Loc[2]
		]);

	}

}

Funcs.Switch = Switch;

class Try extends AstNode {
	constructor(...args) {
		super(...args);
		this.Body = null;
		this.Err = null;
		this.CatchBody = null;
		this.FinalBody = null;
		if(!(this.constructor.prototype instanceof Try) && this.init)return this.init(...args);
	}
	init(body, err, catchBody, finalBody, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Body = body;
		this.Err = err;
		this.CatchBody = catchBody;
		this.FinalBody = finalBody;
	}

	GetCode(tabs, tabsin) {
		var catchcode,finalcode;
		this.Loc[0].col += tabs;

		catchcode = '';
		finalcode = '';

		if (this.CatchBody) {
			this.CatchBody.Inline = false;
			catchcode = "\n" + (this.Tabs(tabs)) + "catch(" + (this.Err? this.Err.GetCode(0, tabsin) : '__ex') + ") " + (this.CatchBody.GetCode(0, tabsin)) + "";
		}

		if (this.FinalBody) {
			this.FinalBody.Inline = false;
			finalcode = "\n" + (this.Tabs(tabs)) + "finally " + (this.FinalBody.GetCode(0, tabsin)) + "";
		}

		this.Body.Inline = false;

		return "" + (this.Tabs(tabs)) + "try " + (this.Body.GetCode(0, tabsin)) + "" + (catchcode) + "" + (finalcode) + "";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		if (this.Err) {
			this.Err.SetParent(this);
		}
		this.Body.SetParent(this);
		if (this.CatchBody) {
			this.CatchBody.SetParent(this);
		}
		if (this.FinalBody) {
			this.FinalBody.SetParent(this);
		}
	}


	GetLocalVars() {
		var res;
		res = [];

		if (this.CatchBody) {
			res = res.concat(this.CatchBody.GetLocalVars());
		}
		if (this.FinalBody) {
			res = res.concat(this.FinalBody.GetLocalVars());
		}
		res = res.concat(this.Body.GetLocalVars());
		return res;
	}

	TransformAST(locals, classNames) {
		if (this.Err) {
			this.Err.TransformAST(locals, classNames);
		}
		this.Body.TransformAST(locals, classNames);
		if (this.CatchBody) {
			this.CatchBody.TransformAST(locals, classNames);
		}
		if (this.FinalBody) {
			this.FinalBody.TransformAST(locals, classNames);
		}
	}

	GetMappings() {
		var catchcode,finalcode,paren;
		catchcode = [];
		finalcode = [];

		if (this.CatchBody) {
			paren = this.CloneObj(this.Loc[1]);
			paren.toCol = 2;
			if (this.Body.Body.length > 0) {
				this.Loc[1].line++;
			}
			this.Loc[1].col = this.Loc[0].col;
			this.Loc[1].toCol = 6;
			catchcode = [
				this.Loc[1]
			].concat((this.Err? this.Err.GetMappings() : []), [
				paren
			], this.CatchBody.GetMappings());

		}

		if (this.FinalBody) {
			if ((this.CatchBody && this.CatchBody.Body.length > 0) || (!this.CatchBody  && this.Body.Body.length > 0)) {
				this.Loc[2].line++;
			}
			this.Loc[2].col = this.Loc[0].col;
			this.Loc[2].toCol = 8;
			finalcode = [
				this.Loc[2]
			].concat(this.FinalBody.GetMappings());

		}

		this.Loc[0].toCol = 4;
		return [
			this.Loc[0]
		].concat(this.Body.GetMappings(), catchcode, finalcode);

	}

}

Funcs.Try = Try;


class With extends AstNode {
	constructor(...args) {
		super(...args);
		this.Exp = null;
		this.Body = null;
		if(!(this.constructor.prototype instanceof With) && this.init)return this.init(...args);
	}
	init(exp, body, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Exp = exp;
		this.Body = body;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col += tabs;
		return this.Tabs(tabs) + 'with( ' + this.Exp.GetCode(0, tabsin) + ' ) ' + this.Body.GetCode(tabs, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Exp.SetParent(this);
		this.Body.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Exp.GetLocalVars();
		return res.concat(this.Body.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Exp.TransformAST(locals, classNames);
		this.Body.TransformAST(locals, classNames);
	}

	GetMappings() {
		var end;
		end = this.CloneObj(this.Loc);
		end.col = 0;
		end.toCol = 3;
		this.Loc.toCol = 6;
		return [
			this.Loc
		].concat(this.Exp.GetMappings(), [
			end
		], this.Body.GetMappings());
	}

}

Funcs.With = With;

class Call extends AstNode {
	constructor(...args) {
		super(...args);
		this.Left = null;
		this.Params = null;
		this.LocCommas = null;
		if(!(this.constructor.prototype instanceof Call) && this.init)return this.init(...args);
	}
	init(left, params, loc) {
		var p;
		AstNode.prototype.init.call(this,loc);
		this.Left = left;

		this.Params = [];
		this.LocCommas = [];
		var i=0
		for (var k in params) {
			p = params[k];
			this.Params.push(p[0]);
			if (i > 0) {
				this.LocCommas.push(p[1]);
			}
			i++;
		}
	}

	GetCode(tabs, tabsin) {
		var paramsCode,p;
		paramsCode = '';

		var i=0
		for (var k in this.Params) {
			p = this.Params[k];
			if (i > 0) {
				paramsCode += ', ';
			}
			paramsCode += p.GetCode(0, tabsin);
			i++;
		}

		return this.Left.GetCode(tabs, tabsin) + '(' + paramsCode + ')';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);
		this.Left.SetParent(this);
		this.SetChildParents(this.Params);
	}

	GetLocalVars() {
		var res;
		res = this.Left.GetLocalVars();
		return res.concat(this.GetChildLocalVars(this.Params));
	}

	TransformAST(locals, classNames) {
		this.Left.TransformAST(locals, classNames);
		this.TransformASTInChild(this.Params, locals, classNames);
	}

	GetMappings() {
		var left,par,p;
		left = this.Left.GetMappings();

		par = [];
		var i=0
		for (var k in this.Params) {
			p = this.Params[k];
			par = par.concat(p.GetMappings());

			if (i < this.Params.length - 1) {
				this.LocCommas[i].line = this.LocCommas[i].toLine = 0;
				this.LocCommas[i].col = 0;
				this.LocCommas[i].toCol = 2;
				par.push(this.LocCommas[i]);
			}
			i++;
		}

		if (this.Loc) {
			return left.concat([
				this.Loc[0]
			], par, [
				this.Loc[1]
			]);
		}
		else {
			return left.concat(par);
		}
	}

	getASTAsString(tabs) {
		var h;
		h = tabs + 'Call ' + (this.Left.getASTAsString("")) + '(';
		var i=0
		for (var c of this.Params) {
			if (i > 0) {
				h += ', ';
			}
			h += c.getASTAsString('');
			i++;
		}
		h += ')';

		return h;
	}

}


Funcs.Call = Call;

class Arra extends AstNode {
	constructor(...args) {
		super(...args);
		this.Elements = null;
		if(!(this.constructor.prototype instanceof Arra) && this.init)return this.init(...args);
	}
	init(elements, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Elements = elements;
	}

	GetCode(tabs, tabsin) {
		var elementsCode,e;
		this.Loc.col += tabs;

		if (this.Elements.length === 0) {
			return this.Tabs(tabs) + '[]';
		}

		elementsCode = '';

		for (var i in this.Elements) {
			e = this.Elements[i];
			if (e.Type === 'EmptyLine' || (e.Type === 'Comment' && !e.showComments )) {
				elementsCode += '\n';
			}
			else {
				elementsCode += '\n' + e.GetCode(tabsin + 1, tabsin + 1);
				if (i < this.Elements.length - 1) {
					elementsCode += ',';
				}
			}
		}

		return this.Tabs(tabs) + '[' + elementsCode + '\n' + (this.Tabs(tabsin)) + ']';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.SetChildParents(this.Elements);
	}

	GetLocalVars() {
		return this.GetChildLocalVars(this.Elements);
	}

	TransformAST(locals, classNames) {
		this.TransformASTInChild(this.Elements, locals, classNames);
	}

	GetMappings() {
		var elementsCode,e,com,end;
		elementsCode = [];

		for (var i in this.Elements) {
			e = this.Elements[i];
			if (i > 0) {
				com = this.CloneObj(this.Loc);
				com.col = 0;
				com.toCol = 2;
				elementsCode = elementsCode.concat(com);

			}
			elementsCode = elementsCode.concat(e.GetMappings());

		}

		end = this.CloneObj(this.Loc);
		end.col = 0;

		return [
			this.Loc
		].concat(elementsCode, end);

	}

}

Funcs.Arra = Arra;


class Objt extends AstNode {
	constructor(...args) {
		super(...args);
		this.Elements = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Objt) && this.init)return this.init(...args);
	}
	init(elements, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Elements = elements;
	}

	GetCode(tabs, tabsin) {
		var elementsCode,e;
		this.TabsIn = [
			tabs,
			tabsin
		];

		elementsCode = '';
		for (var i in this.Elements) {
			e = this.Elements[i];
			if (!(Array.isArray(e))) {
				elementsCode += '\n' + this.Tabs(tabsin + 1);
			}
			else {
				elementsCode += '\n' + this.Tabs(tabsin + 1) + e[0].GetCode(0, tabsin) + ' : ' + e[1].GetCode(0, tabsin + 1);
				if (i < this.Elements.length - 1) {
					elementsCode += ',';
				}
			}
		}

		return this.Tabs(tabs) + '{' + elementsCode + (this.Elements.length > 0? '\n' + (this.Tabs(tabsin)) + '' : '') + '}';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		for (var e of this.Elements) {
			if (!(Array.isArray(e))) {
				e.SetParent(this);
			}
			else {
				e[0].SetParent(this);
				e[1].SetParent(this);
			}
		}
	}

	GetLocalVars() {
		var res;
		res = [];
		for (var e of this.Elements) {
			if (!(Array.isArray(e))) {
				res = res.concat(e.GetLocalVars());
			}
			else {
				res = res.concat(e[0].GetLocalVars());
				res = res.concat(e[1].GetLocalVars());
			}
		}

		return res;
	}

	TransformAST(locals, classNames) {
		for (var e of this.Elements) {
			if (!(Array.isArray(e))) {
				e.TransformAST(locals, classNames);
			}
			else {
				e[0].TransformAST(locals, classNames);
				if (e[0].Type === 'Tag') {
					e[0].IsClassStatic = false;
					e[0].IsClassProp = false;
				}
				e[1].TransformAST(locals, classNames);
			}
		}
	}

	GetMappings() {
		var elementsCode,e,com,start,col,skip,end;
		elementsCode = [];
		for (var i in this.Elements) {
			e = this.Elements[i];
			if (!(Array.isArray(e))) {
				elementsCode = elementsCode.concat(e.GetMappings());
			}
			else {
				if (i > 0) {
					com = this.CloneObj(this.Loc);
					com.toCol = 2;
					elementsCode = elementsCode.concat(com);

				}
				start = this.CloneObj(this.Loc);
				start.line = 1;
				start.col = this.TabsIn[1] + 1;
				start.toCol = 0;
				col = this.CloneObj(this.Loc);
				col.toCol = 3;
				elementsCode = elementsCode.concat(start, e[0].GetMappings(), col, e[1].GetMappings());

			}
		}

		skip = this.CloneObj(this.Loc);
		skip.toLine++;
		skip.toCol = 0;
		end = this.CloneObj(this.Loc);
		end.col += this.TabsIn[1];
		this.Loc.col += this.TabsIn[0];

		return [
			this.Loc
		].concat(elementsCode, (this.Elements.length > 0? skip : []), end);

	}

}

Funcs.Objt = Objt;

class Return extends AstNode {
	constructor(...args) {
		super(...args);
		this.Exp = null;
		if(!(this.constructor.prototype instanceof Return) && this.init)return this.init(...args);
	}
	init(exp, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Exp = exp;
	}

	GetCode(tabs, tabsin) {
		var res;
		this.Loc.col = tabs;
		return res = this.Tabs(tabs) + 'return' + (this.Exp? ' ' + this.Exp.GetCode(0, tabsin) : '');
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		if (this.Exp) {
			this.Exp.SetParent(this);
		}
	}

	GetLocalVars() {
		var res;
		res = [];
		if (this.Exp) {
			res = this.Exp.GetLocalVars();
		}
		return res;
	}

	TransformAST(locals, classNames) {
		if (this.Exp) {
			this.Exp.TransformAST(locals, classNames);
		}
	}

	GetMappings() {
		var end;
		end = this.CloneObj(this.Loc);
		end.col = 0;
		end.toCol = 1;
		this.Loc.toCol = 6;
		if (this.Exp) {
			this.Loc.toCol++;
			return [
				this.Loc
			].concat(this.Exp.GetMappings(), end);
		}
		else {
			return [
				this.Loc
			].concat(end);
		}
	}

}

Funcs.Return = Return;

class Property extends AstNode {
	constructor(...args) {
		super(...args);
		this.Left = null;
		this.Right = null;
		if(!(this.constructor.prototype instanceof Property) && this.init)return this.init(...args);
	}
	init(left, right, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Left = left;
		this.Right = right;
	}

	GetCode(tabs, tabsin) {
		return this.Left.GetCode(tabs, tabsin) + '.' + this.Right.GetCode(0, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Left.SetParent(this);
		this.Right.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Left.GetLocalVars();
		return res.concat(this.Right.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Left.TransformAST(locals, classNames);
		this.Right.TransformAST(locals, classNames);
	}

	GetMappings() {
		return this.Left.GetMappings().concat(this.Loc, this.Right.GetMappings());
	}

}

Funcs.Property = Property;

class Index extends AstNode {
	constructor(...args) {
		super(...args);
		this.Left = null;
		this.Right = null;
		if(!(this.constructor.prototype instanceof Index) && this.init)return this.init(...args);
	}
	init(left, right, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Left = left;
		this.Right = right;
	}

	GetCode(tabs, tabsin) {
		return this.Left.GetCode(tabs, tabsin) + '[' + this.Right.GetCode(0, tabsin) + ']';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Left.SetParent(this);
		this.Right.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Left.GetLocalVars();
		return res.concat(this.Right.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Left.TransformAST(locals, classNames);
		this.Right.TransformAST(locals, classNames);
	}

	GetMappings() {
		return this.Left.GetMappings().concat([
			this.Loc[0]
		], this.Right.GetMappings(), [
			this.Loc[1]
		]);
	}

}

Funcs.Index = Index;

class Assignament extends AstNode {
	constructor(...args) {
		super(...args);
		this.Left = null;
		this.Right = null;
		this.Op = null;
		if(!(this.constructor.prototype instanceof Assignament) && this.init)return this.init(...args);
	}
	init(left, op, right, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Left = left;
		this.Right = right;
		this.Op = op;
	}

	GetCode(tabs, tabsin) {
		return this.Left.GetCode(tabs, tabsin) + ' ' + this.Op.GetCode(0, tabsin) + ' ' + this.Right.GetCode(0, tabsin);
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Left.SetParent(this);
		this.Op.SetParent(this);
		this.Right.SetParent(this);
	}

	GetLocalVars() {
		var res;
		res = this.Left.GetLocalVars();
		return res.concat(this.Right.GetLocalVars());
	}

	TransformAST(locals, classNames) {
		this.Left.TransformAST(locals, classNames);
		this.Op.TransformAST(locals, classNames);
		this.Right.TransformAST(locals, classNames);
	}

	GetMappings() {
		var left,op,right;
		left = this.Left.GetMappings();

		op = this.Op.GetMappings();
		op[0].toCol += 2;

		right = this.Right.GetMappings();

		return left.concat(op.concat(right));
	}

	getASTAsString(tabs) {
		var h;
		h = AstNode.prototype.getASTAsString.call(this,tabs);
		h += '\n' + this.Left.getASTAsString(tabs + '\t');
		h += '\n' + this.Op.getASTAsString(tabs + '\t');
		h += '\n' + this.Right.getASTAsString(tabs + '\t');

		return h;
	}

}

Funcs.Assignament = Assignament;

class Throw extends AstNode {
	constructor(...args) {
		super(...args);
		this.Exp = null;
		if(!(this.constructor.prototype instanceof Throw) && this.init)return this.init(...args);
	}
	init(exp, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Exp = exp;
	}

	GetCode(tabs, tabsin) {
		return this.Tabs(tabs) + "throw " + ((this.Exp? this.Exp.GetCode(0, tabsin) : '')) + "";
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Exp.SetParent(this);
	}

	GetLocalVars() {
		var res;
		return res = this.Exp.GetLocalVars();
	}

	TransformAST(locals, classNames) {
		this.Exp.TransformAST(locals, classNames);
	}

}

Funcs.Throw = Throw;

class Exp extends AstNode {
	constructor(...args) {
		super(...args);
		this.Child = null;
		if(!(this.constructor.prototype instanceof Exp) && this.init)return this.init(...args);
	}
	init(child, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Child = child;
	}

	GetCode(tabs, tabsin) {
		if (typeof this.Child  === 'string') {
			return this.Tabs(tabs) + this.Child;
		}
		else {
			return this.Child.GetCode(tabs, tabsin);
		}
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Child.SetParent(this);
	}

	GetLocalVars() {
		return this.Child.GetLocalVars();
	}

	TransformAST(locals, classNames) {
		this.Child.TransformAST(locals, classNames);
	}

}

Funcs.Exp = Exp;

class Paren extends AstNode {
	constructor(...args) {
		super(...args);
		this.Child = null;
		if(!(this.constructor.prototype instanceof Paren) && this.init)return this.init(...args);
	}
	init(child, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Child = child;
	}

	GetCode(tabs, tabsin) {
		return this.Tabs(tabs) + '(' + this.Child.GetCode(0, tabsin) + ')';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Child.SetParent(this);
	}

	GetLocalVars() {
		return this.Child.GetLocalVars();
	}

	TransformAST(locals, classNames) {
		this.Child.TransformAST(locals, classNames);
	}

	GetMappings() {
		return [
			this.Loc[0]
		].concat(this.Child.GetMappings(), [
			this.Loc[1]
		]);
	}

}

Funcs.Paren = Paren;

class Boolean extends AstNode {
	constructor(...args) {
		super(...args);
		this.Value = null;
		if(!(this.constructor.prototype instanceof Boolean) && this.init)return this.init(...args);
	}
	init(value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		var val;
		this.Loc.col += tabs;
		if (this.Value === 'true' || this.Value === 'yes') {
			val = 'true';
			this.Loc.toCol = 4;
		}
		else {
			val = 'false';
			this.Loc.toCol = 5;
		}
		return this.Tabs(tabs) + val;
	}

}

Funcs.Boolean = Boolean;


class Exist extends AstNode {
	constructor(...args) {
		super(...args);
		this.Exp = null;
		this.ExpOpt = null;
		if(!(this.constructor.prototype instanceof Exist) && this.init)return this.init(...args);
	}
	init(exp, expOpt, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Exp = exp;
		this.ExpOpt = expOpt;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col = tabs;

		if (this.Exp.Type === 'Tag' && !this.Exp.IsClassStatic  && !this.Exp.IsClassProp ) {
			if (this.ExpOpt) {
				return this.Tabs(tabs) + "(typeof " + (this.Exp.GetCode(0, tabsin)) + " !== 'undefined' && " + (this.Exp.GetCode(0, tabsin)) + " !== null) ? " + (this.Exp.GetCode(0, tabsin)) + " : " + (this.ExpOpt.GetCode(0, tabsin)) + "";
			}
			else {
				return this.Tabs(tabs) + "(typeof " + (this.Exp.GetCode(0, tabsin)) + " !== 'undefined' && " + (this.Exp.GetCode(0, tabsin)) + " !== null)";
			}
		}
		else {
			if (this.ExpOpt) {
				return this.Tabs(tabs) + "((__v=" + (this.Exp.GetCode(0, tabsin)) + ") != null)? __v : " + (this.ExpOpt.GetCode(0, tabsin)) + "";
			}
			else {
				return this.Tabs(tabs) + "" + (this.Exp.GetCode(0, tabsin)) + " != null";
			}
		}
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Exp.SetParent(this);
		if (this.ExpOpt) {
			this.ExpOpt.SetParent(this);
		}
	}

	TransformAST(locals, classNames) {
		this.Exp.TransformAST(locals, classNames);
		if (this.ExpOpt) {
			this.ExpOpt.TransformAST(locals, classNames);
		}
	}

	GetLocalVars() {
		var res;
		res = this.Exp.GetLocalVars();

		if (this.ExpOpt) {
			res = res.concat(this.ExpOpt.GetLocalVars());
			res.push('__v');
		}

		return res;
	}

	GetMappings() {
		var end,exp,med,semi;
		if (this.Exp.Type === 'Tag' && !this.Exp.IsClassStatic  && !this.Exp.IsClassProp ) {
			if (this.ExpOpt) {
				this.Loc.toCol = 8;
				exp = this.Exp.GetMappings();
				med = this.CloneObj(this.Loc);
				med.col = 0;
				med.toCol = 20;
				semi = this.CloneObj(med);
				semi.toCol = 3;
				end = this.CloneObj(med);
				end.toCol = 13;
				return [
					this.Loc
				].concat(exp, [
					med
				], (this.CloneObj(exp)), [
					end
				], (this.CloneObj(exp)), [
					semi
				], this.ExpOpt.GetMappings());

			}
			else {
				this.Loc.toCol = 8;
				exp = this.Exp.GetMappings();
				med = this.CloneObj(this.Loc);
				med.col = 0;
				med.toCol = 20;
				end = this.CloneObj(med);
				end.toCol = 10;
				return [
					this.Loc
				].concat(exp, [
					med
				], (this.CloneObj(exp)), [
					end
				]);

			}
		}
		else {
			if (this.ExpOpt) {
				end = this.CloneObj(this.Loc);
				end.col = 0;
				end.toCol = 18;
				exp = this.Exp.GetMappings();
				exp[0].col += this.Loc.col + 6;
				return exp.concat([
					end
				], this.ExpOpt.GetMappings());

			}
			else {
				end = this.CloneObj(this.Loc);
				end.col = 0;
				end.toCol = 3;
				exp = this.Exp.GetMappings();
				exp[0].col += this.Loc.col;
				return exp.concat([
					end
				]);

			}
		}
	}

}

Funcs.Exist = Exist;

class _Export extends AstNode {
	constructor(...args) {
		super(...args);
		this.Child = null;
		this.Name = null;
		if(!(this.constructor.prototype instanceof _Export) && this.init)return this.init(...args);
	}
	init(child, name, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Child = child;
		this.Name = name;
	}

	GetCode(tabs, tabsin) {
		this.Loc.col = tabs;

		if (this.Child.Type === 'Class') {
			return this.Child.GetCode(tabs, tabsin) + this.Tabs(tabs) + 'Export.' + this.Name + ' = ' + this.Name;
		}
		else {
			return this.Tabs(tabs) + 'Export.' + this.Name + ' = ' + this.Child.GetCode(0, tabsin);
		}
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.Child.SetParent(this);
	}

	TransformAST(locals, classNames) {
		this.Child.TransformAST(locals, classNames);
		if (!(this.Name)) {
			if (this.Child.Type === 'Class') {
				this.Name = this.Child.Name.Value;
			}
			else {
				if (this.Child.Type === 'Assignament') {
					this.Name = this.Child.Left.Value;
				}
				else {
					this.Name = 'default';
				}
			}
		}
		classNames.Document.HasExports = true;
	}

	GetMappings() {
		if (this.Child.Type === 'Class') {
			this.Loc.toCol = 7 + this.Name.length * 2 + 3;
			return this.Child.GetMappings().concat([
				this.Loc
			]);

		}
		else {
			this.Loc.toCol = 7 + this.Name.length + 3;
			return [
				this.Loc
			].concat(this.Child.GetMappings());

		}
	}

}

Funcs.Export = _Export;

class Import extends AstNode {
	constructor(...args) {
		super(...args);
		this.Path = null;
		this.Vars = null;
		if(!(this.constructor.prototype instanceof Import) && this.init)return this.init(...args);
	}
	init(path, vars, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Path = path;
		this.Vars = vars;
	}

	GetCode(tabs, tabsin) {
		var vars;
		this.Loc.col += tabs;

		if (this.Vars.length === 1) {
			if (this.Vars[0][1] != null) {
				vars = this.Vars[0][1];
			}
			else {
				vars = this.Vars[0][0];
			}
			return "" + (this.Tabs(tabs)) + "" + (vars) + " = (await Metab.importFromFile(\"" + (this.Document.File) + "\"," + (this.Path) + "))." + (this.Vars[0][0]) + ";";
		}
		else {
			vars = '';
			for (var v of this.Vars) {
				if (vars.length > 0) {
					vars += ', ';
				}

				if (v[1] != null) {
					vars += v[0] + ' : ' + v[1];
				}
				else {
					vars += v[0];
				}
			}

			return "" + (this.Tabs(tabs)) + "{" + (vars) + "} = await Metab.importFromFile(\"" + (this.Document.File) + "\"," + (this.Path) + ");";
		}
	}
	TransformAST(locals, classNames) {
		if (classNames.Function) {
			classNames.Function.HasAwaits = true;
		}
		else {
			classNames.Document.HasAwaits = true;
		}

		this.Document = classNames.Document;
	}

	GetLocalVars() {
		var parts,res;
		if (!(this.Vars)) {
			parts = this.Path.substr(1, this.Path.length - 2).split('/');
			parts = parts[parts.length - 1].split('.');
			if (parts.length > 1) {
				parts.pop();
			}

			parts = parts.join('.');
			this.Vars = [
				[
					'default',
					parts
				]
			];
		}


		res = [];
		for (var v of this.Vars) {
			if (v[1]) {
				res.push(v[1]);
			}
			else {
				res.push(v[0]);
			}
		}

		return res;
	}
	GetMappings() {
		return [
			this.Loc
		];
	}

}

Funcs.Import = Import;


class LocalVar extends AstNode {
	constructor(...args) {
		super(...args);
		this.Names = null;
		this.Value = null;
		if(!(this.constructor.prototype instanceof LocalVar) && this.init)return this.init(...args);
	}
	init(names, value, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Names = names;
		this.Value = value;
	}

	GetCode(tabs, tabsin) {
		if (this.Value) {
			return this.Tabs(tabs) + "var " + this.Names + " = " + this.Value;
		}
		else {
			return this.Tabs(tabs) + "var " + this.Names;
		}
	}

}

Funcs.LocalVar = LocalVar;

class Hon extends AstNode {
	constructor(...args) {
		super(...args);
		this.TypeNode = null;
		this.Values = null;
		this.Childs = null;
		this.TabsIn = null;
		if(!(this.constructor.prototype instanceof Hon) && this.init)return this.init(...args);
	}
	init(type, values, childs, loc) {
		AstNode.prototype.init.call(this,loc);
		this.TypeNode = type;
		this.Values = values;
		this.Childs = childs;
	}

	GetCode(tabs, tabsin) {
		var valsCode,childsCode;
		this.TabsIn = [
			tabs,
			tabsin
		];

		if (this.Values) {
			valsCode = ',';
			var i=0
			for (var e of this.Values) {
				if (i > 0) {
					valsCode += ', ';
				}
				valsCode += '\n' + this.Tabs(tabsin + 1) + e[0].GetCode(0, tabsin) + ': ' + e[1].GetCode(0, tabsin + 1);
				i++;
			}
		}
		else {
			valsCode = '';
		}

		if (this.Childs) {
			childsCode = ',\n' + this.Tabs(tabsin + 1) + '_c: [\n';
			var i=0
			for (var e of this.Childs) {
				if (e.Type === 'EmptyLine') {
					childsCode += '\n';
				}
				else {
					childsCode += e.GetCode(tabsin + 2, tabsin + 2) + ',\n';
				}
				i++;
			}


			childsCode += '\n' + this.Tabs(tabsin + 1) + ']';
		}
		else {
			childsCode = '';
		}


		return this.Tabs(tabs) + "{\n" + this.Tabs(tabsin + 1) + "_t: " + this.TypeNode.GetCode(0, tabsin) + valsCode + childsCode + "\n" + this.Tabs(tabsin) + '}';
	}

	SetParent(parent) {
		AstNode.prototype.SetParent.call(this,parent);

		this.TypeNode.SetParent(this);

		if (this.Values) {
			for (var e of this.Values) {
				e[0].SetParent(this);
				e[1].SetParent(this);
			}
		}

		if (this.Childs != null) {
			this.SetChildParents(this.Childs);
		}
	}

	GetLocalVars() {
		var res;
		res = [];

		res = res.concat(this.TypeNode.GetLocalVars());

		if (this.Values) {
			for (var e of this.Values) {
				res = res.concat(e[0].GetLocalVars());
				res = res.concat(e[1].GetLocalVars());
			}
		}

		if (this.Childs) {
			for (var e of this.Childs) res = res.concat(e.GetLocalVars())
		}

		return res;
	}

	TransformAST(locals, classNames) {
		this.TypeNode.TransformAST(locals, classNames);

		if (this.Values) {
			for (var e of this.Values) {
				if (e[0].Type === 'Tag') {
					e[0]._CanBeClassProperty = false;
				}
				e[0].TransformAST(locals, classNames);

				e[1].TransformAST(locals, classNames);
			}
		}

		if (this.Childs) {
			for (var e of this.Childs) {
				e.Loc = this.Loc;
				e.TransformAST(locals, classNames);
			}
		}
	}

	GetMappings() {
		var vals,com,start,col,childs,arr,endArr,type,end,t;
		vals = [];

		if (this.Values) {
			for (var e of this.Values) {
				com = this.CloneObj(this.Loc);
				com.toCol = 2;
				vals = vals.concat(com);

				start = this.CloneObj(this.Loc);
				start.line = 1;
				start.col = this.TabsIn[1] + 1;
				start.toCol = 0;
				col = this.CloneObj(this.Loc);
				col.toCol = 2;
				vals = vals.concat(start, e[0].GetMappings(), col, e[1].GetMappings());
			}
		}

		childs = [];

		if (this.Childs) {
			arr = this.CloneObj(this.Loc);
			arr.line++;
			arr.toLine++;
			childs.push(arr);

			var i=0
			for (var c of this.Childs) {
				if (i > 0) {
					com = this.CloneObj(this.Loc);
					com.line++;

					childs = childs.concat(com);
				}
				childs = childs.concat(c.GetMappings());
				i++;
			}

			endArr = this.CloneObj(this.Loc);
			endArr.line++;
			childs.push(endArr);
		}

		type = this.TypeNode.GetMappings();


		end = this.CloneObj(this.Loc);
		end.line += this.Childs? 1 : 1;
		end.col = this.TabsIn[1];
		t = this.CloneObj(this.Loc);
		t.col = this.TabsIn[1];
		t.toCol = 5;

		start = this.CloneObj(this.Loc);
		start.col += this.TabsIn[0];

		start.toLine++;

		return [
			start
		].concat(t, type, vals, childs, end);
	}

}

Funcs.Hon = Hon;

class Comment extends AstNode {
	constructor(...args) {
		super(...args);
		this.Comm = null;
		this.Multi = null;
		this.showComments = true;
		if(!(this.constructor.prototype instanceof Comment) && this.init)return this.init(...args);
	}
	init(comm, multi, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Comm = comm;
		this.Multi = multi;
	}


	TransformAST(locals, classNames) {
		this.showComments = classNames.Document.showComments;
		AstNode.prototype.TransformAST.call(this,locals,classNames);
	}

	GetCode(tabs, tabsin) {
		var c;
		if (!(this.showComments)) {
			return '';
		}

		this.Loc.col += tabs;
		if (this.Multi) {
			c = this.Comm.substr(3, this.Comm.length - 6);
			return this.Tabs(tabs) + '/*' + (c) + '*/';
		}
		else {
			return this.Tabs(tabs) + '//' + (this.Comm.substr(1)) + '';
		}
	}

	GetMappings(...args) {
		var lines;
		if (!(this.showComments)) {
			return AstNode.prototype.GetMappings.apply(this,...args);
		}

		if (this.Multi) {
			lines = this.Comm.split('\n');
			this.Loc.toLine = lines.length - 1;
			this.Loc.toCol = lines[lines.length - 1].length - 1;
		}
		else {
			this.Loc.toCol = this.Comm.length + 1;
		}

		return AstNode.prototype.GetMappings.apply(this,...args);
	}

}

Funcs.Comment = Comment;

class EmptyLine extends AstNode {
	constructor(...args) {
		super(...args);
		this.Lines = null;
		if(!(this.constructor.prototype instanceof EmptyLine) && this.init)return this.init(...args);
	}
	init(lines, loc) {
		AstNode.prototype.init.call(this,loc);
		this.Lines = lines;
	}

	GetCode(tabs, tabsin) {
		return '';
	}

	GetMappings(...args) {
		return AstNode.prototype.GetMappings.apply(this,...args);
	}

}


Funcs.EmptyLine = EmptyLine;




class Parser {
	constructor(...args) {
		this.$1 = null;
		this.$2 = null;
		this.$3 = null;
		this.$4 = null;
		this.$5 = null;
		this.$6 = null;
		this.$7 = null;
		this.$8 = null;
		this.$9 = null;
		this.$10 = null;
		this.Loc = null;
		this.LocN1 = null;
		this.LocN2 = null;
		this.LocN3 = null;
		this.LocN4 = null;
		this.LocN5 = null;
		this.LocN6 = null;
		this.LocN7 = null;
		this.LocN8 = null;
		this.LocN9 = null;
		this.LocN10 = null;

		this.result = null;
		if(!(this.constructor.prototype instanceof Parser) && this.init)return this.init(...args);
	}

	set $$(v) {

		var i=0
		for (var t of v) {


			this['$' + (parseInt(i) + 1)] = t[1];
			this['LocN' + (parseInt(i) + 1)] = t[2];
			i++;
		}

		this.Loc = {
			firstLine : v[0][2].firstLine,
			firstCol : v[0][2].firstCol,
			lastLine : v[v.length - 1][2].lastLine,
			lastCol : v[v.length - 1][2].lastCol
		};
	}

	runFunc(func) {
		if (!((typeof func !== 'undefined' && func !== null))) {
			func = () => {
				return this.$1;
			};
		}





		return func();
	}

	FuncReduce(func, tokens) {

		this.$$ = tokens;
		return this.runFunc(func);
	}

	parseFunc(tokens, tableTerminals, tableNonTerminals, nameTerm, functions, rules, grammar) {
		var currentToken,stack,nextToken,token,s,st,act,t,number,toks,ruleSize,tok,nonT,loc;



		currentToken = 0;

		stack = [
			'ERRR',
			0
		];


		nextToken = () => {
			t = tokens[currentToken];
			currentToken++;

			return t;
		};

		token = nextToken();


		while (true) {
			s = stack[stack.length - 1];



			st = tableTerminals[nameTerm[token[0]]];





			if (!((typeof st !== 'undefined' && st !== null))) {
				this.throwError(token[2].firstLine + 1, token[2].firstCol + 1, token, 'unknown token ··' + (token[1]) + '··');
			}

			act = st[s];

			if (act === undefined) {
				t = tokens[currentToken - 1];


				this.throwError(t[2].firstLine + 1, t[2].firstCol + 1, t, 'unexpected token ··' + (t[1]) + '··');
			}




			if (act < 0) {
				number = -act  - 1;




				toks = [];

				ruleSize = rules[number][1];
				for (var i = 0 ; 0<ruleSize? i<ruleSize : i>ruleSize ; 0<ruleSize? i+= 1 : i-= 1 ) {
					stack.pop();
					tok = stack.pop();
					toks.unshift(tok);
				}



				this.result = this.FuncReduce(functions[number], toks);

				s = stack[stack.length - 1];

				nonT = rules[number][0];
				loc = {
					firstLine : toks[0].firstLine,
					firstCol : toks[0].firstCol,
					lastLine : toks[toks.length - 1].lastLine,
					lastCol : toks[toks.length - 1].lastCol
				};
				stack.push([
					null,
					this.result,
					loc
				]);
				stack.push(tableNonTerminals[nonT][s]);

			}
			else {
				if (act >= 0) {


					stack.push(token);
					stack.push(act);
					token = nextToken();

				}
				else {
					if (act === 'a') {

						return this.result;
					}
					else {
						if (act === 'e') {
							this.throwError(t[2].firstLine + 1, t[2].firstCol + 1, tname, 'operator ··' + (tname) + '·· is not associative');


						}
						else {
							this.throwError(t[2].firstLine + 1, t[2].firstCol + 1, tname, 'unexpected token ··' + (tname) + '··');


						}
					}
				}
			}
		}
	}

	throwError(line, col, token, err) {
		throw '' + (line) + ':' + (col) + ' ' + (err) + '';
	}

}

var tableTerm = {"0":{"1":"a","2":-2,"3":-3,"65":-4,"66":-5,"68":-278,"69":-279,"268":-6},"1":{"0":63,"2":63,"3":-3,"8":63,"10":63,"11":63,"17":63,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"27":63,"28":-41,"29":63,"30":-43,"31":-44,"32":63,"33":-55,"34":-56,"35":63,"36":279,"37":63,"38":63,"39":63,"40":279,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":63,"52":279,"54":63,"55":63,"56":63,"57":63,"58":63,"59":63,"60":63,"61":63,"62":604,"65":-4,"66":-5,"67":63,"68":-278,"69":-279,"71":-45,"72":63,"73":63,"74":63,"75":63,"76":63,"77":-57,"78":63,"79":63,"80":63,"81":63,"82":63,"83":63,"84":63,"85":63,"86":-46,"87":-48,"88":-35,"89":-36,"90":63,"91":-283,"92":-282,"98":63,"108":-193,"119":63,"123":63,"124":-47,"125":63,"126":-219,"127":63,"128":-232,"129":-40,"130":63,"131":-226,"132":63,"133":-218,"134":63,"135":-220,"136":63,"137":-221,"138":63,"139":-222,"140":63,"141":-223,"142":63,"143":-224,"144":63,"145":-225,"146":63,"147":-62,"148":-227,"149":63,"150":-228,"151":63,"152":-229,"153":63,"154":-230,"155":63,"156":-231,"157":63,"158":-233,"159":63,"160":-234,"161":63,"162":-235,"163":63,"164":-236,"165":63,"166":-237,"167":63,"168":63,"169":-238,"170":-194,"173":-195,"174":63,"176":63,"177":-239,"178":63,"179":-240,"180":63,"181":-241,"182":63,"183":-242,"184":63,"185":-243,"186":63,"187":-244,"188":63,"189":-245,"190":63,"191":-246,"192":63,"193":-247,"194":63,"195":-248,"196":63,"197":-65,"198":-249,"199":63,"200":-250,"201":63,"202":-251,"203":63,"204":210,"205":210,"206":-252,"207":210,"208":-255,"209":-261,"220":-256,"222":-262,"224":210,"225":210,"228":-263,"230":210,"231":210,"238":210,"241":210,"249":210,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"268":-6,"269":63,"273":63,"275":63,"277":279,"279":63,"280":-7,"281":63,"282":-8,"285":63,"288":63,"293":-42,"298":-49,"299":-50,"300":63,"302":279,"303":-88,"313":279,"314":-89,"316":63,"321":63,"323":279,"324":-87,"327":279,"328":-90,"330":63,"332":279,"335":340,"339":279,"340":63,"346":63,"347":63,"348":63,"349":63,"350":279,"354":63,"356":63,"357":279,"359":63,"360":63,"363":-210,"369":371,"372":373,"408":63,"412":63,"421":279,"422":-91,"424":63,"425":279,"426":-92,"429":279,"430":-93,"432":279,"433":-94,"457":63,"459":63,"465":279,"467":63,"469":279,"471":63,"472":63,"473":-164,"474":-165,"477":63,"479":279,"482":63,"483":279,"486":63,"487":279,"492":63,"494":63,"495":279,"497":279,"500":63,"501":279,"504":63,"505":279,"507":63,"508":63,"509":-166,"510":-167,"511":279,"514":279,"515":279,"517":279,"518":279,"521":279,"524":525,"525":63,"528":279,"529":279,"530":63,"531":279,"535":-186,"537":63,"538":279,"539":279,"540":63,"541":279,"547":279,"549":63,"550":-187,"558":279,"563":63,"577":340,"580":279,"582":-196,"588":-197,"589":63,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"2":{"3":-3,"65":-4,"66":-5,"68":-278,"69":-279,"223":228,"233":-268,"234":-269,"240":-270,"244":-271,"245":-264,"246":-265,"247":-266,"248":-267,"268":-6,"279":280,"281":282,"340":280,"361":363,"374":394,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":462,"526":536,"537":-169,"546":-173,"553":-172,"555":-170,"557":-171,"611":612},"3":{"0":6,"2":6,"3":-3,"62":104,"63":104,"65":-4,"66":-5,"68":-278,"69":-279,"71":104,"204":104,"205":104,"221":104,"225":104,"231":104,"235":104,"268":-6,"279":6,"281":6,"340":353,"361":104,"362":104,"604":104,"607":104,"608":104,"611":104},"4":{"0":7,"2":7,"3":-3,"62":103,"63":103,"65":-4,"66":-5,"68":-278,"69":-279,"71":103,"204":103,"205":103,"221":103,"225":103,"231":103,"235":103,"268":-6,"279":7,"281":7,"340":352,"361":103,"362":103,"604":103,"607":103,"608":103,"611":103},"5":{"0":8,"2":8,"3":-3,"62":105,"63":105,"65":-4,"66":-5,"68":-278,"69":-279,"71":105,"204":105,"205":105,"221":105,"225":105,"231":105,"235":105,"268":-6,"279":8,"281":8,"340":354,"361":105,"362":105,"604":105,"607":105,"608":105,"611":105},"6":{"0":9,"2":9,"3":-3,"62":106,"63":106,"65":-4,"66":-5,"68":-278,"69":-279,"71":106,"204":106,"205":106,"221":106,"225":106,"231":106,"235":106,"268":-6,"279":9,"281":9,"340":355,"361":106,"362":106,"604":106,"607":106,"608":106,"611":106},"7":{"0":10,"2":10,"3":-3,"65":-4,"66":-5,"68":-278,"69":-279,"268":-6,"279":10,"281":10,"340":10},"8":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"38":464,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"171":174,"172":-84,"173":-195,"175":-85,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":221,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"237":221,"241":221,"249":221,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"258":174,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"272":273,"274":275,"280":-7,"282":-8,"293":-42,"295":301,"297":326,"298":-49,"299":-50,"303":-88,"304":312,"305":-101,"306":-102,"307":-103,"310":-106,"314":-89,"315":-96,"317":-98,"318":-104,"319":-105,"320":-95,"322":-97,"324":-87,"328":-90,"329":-99,"331":-100,"342":362,"343":-212,"347":464,"363":-210,"364":-213,"365":-214,"366":-215,"367":-216,"368":-217,"384":406,"385":-140,"407":-142,"409":-143,"417":301,"418":326,"422":-91,"426":-92,"427":312,"430":-93,"433":-94,"434":-141,"435":301,"445":447,"446":-133,"448":-135,"450":-136,"452":-134,"453":455,"458":-139,"460":-138,"463":468,"464":490,"468":476,"475":478,"489":491,"531":549,"535":-186,"541":549,"547":549,"550":-187,"558":549,"566":-78,"567":571,"569":-79,"574":-80,"576":-81,"582":-196,"583":589,"584":-198,"585":-199,"586":-200,"587":-201,"588":-197,"590":-202,"591":-203,"592":-204,"593":-205,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"603":607,"605":-207,"606":-208,"609":-209,"610":362,"614":-211},"9":{"0":11,"2":11,"3":-3,"62":115,"63":115,"65":-4,"66":-5,"68":-278,"69":-279,"71":115,"204":115,"205":115,"221":115,"225":115,"231":115,"235":115,"268":-6,"279":11,"281":11,"340":360,"361":115,"362":115,"604":115,"607":115,"608":115,"611":115},"10":{"0":35,"2":35,"3":-3,"4":67,"5":269,"6":-9,"7":-10,"8":-11,"9":-13,"12":-18,"13":-21,"14":-22,"15":-23,"16":-24,"18":-31,"19":-32,"20":-33,"21":-34,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":94,"63":94,"65":-4,"66":-5,"68":-278,"69":-279,"70":-19,"71":94,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":94,"205":94,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"221":94,"222":-262,"225":94,"228":-263,"231":94,"235":94,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"268":-6,"270":-20,"271":-12,"272":-14,"274":-15,"276":-16,"278":-17,"279":35,"280":-7,"281":35,"282":-8,"283":-25,"284":-35,"286":-28,"287":-26,"290":-29,"291":-27,"292":-30,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"333":-144,"334":-145,"335":35,"336":-150,"337":-146,"338":-147,"340":346,"341":-151,"344":-35,"351":-36,"352":-10,"353":-9,"354":-11,"355":-13,"361":94,"362":94,"363":-210,"369":-107,"372":-108,"394":-110,"422":-91,"426":-92,"430":-93,"433":-94,"462":-109,"470":-155,"480":-156,"484":-157,"488":-160,"496":-158,"498":-161,"502":-159,"503":-162,"506":-163,"512":-154,"516":-188,"519":-191,"520":-189,"522":-192,"523":-190,"536":-168,"564":-153,"565":-74,"566":-75,"572":-76,"573":-77,"577":35,"578":-148,"579":-149,"581":-152,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"604":94,"605":-207,"606":-208,"607":94,"608":94,"609":-209,"611":94,"614":-211},"11":{"0":17,"2":17,"3":-3,"62":113,"63":113,"65":-4,"66":-5,"68":-278,"69":-279,"71":113,"204":113,"205":113,"221":113,"225":113,"231":113,"235":113,"268":-6,"279":17,"281":17,"340":359,"361":113,"362":113,"604":113,"607":113,"608":113,"611":113},"12":{"0":22,"2":22,"3":-3,"8":22,"10":22,"11":22,"17":284,"27":22,"29":22,"32":295,"35":22,"37":22,"38":463,"39":22,"41":369,"42":566,"51":22,"53":417,"54":22,"55":22,"56":22,"57":22,"58":22,"59":22,"60":22,"61":22,"62":212,"63":212,"64":204,"65":-4,"66":-5,"67":22,"68":-278,"69":-279,"71":88,"72":22,"73":22,"74":22,"75":22,"76":22,"78":22,"79":22,"80":22,"81":22,"82":22,"83":22,"84":22,"85":22,"90":22,"98":22,"119":22,"122":204,"123":22,"125":22,"127":22,"130":22,"132":22,"134":22,"136":22,"138":22,"140":22,"142":22,"144":22,"146":22,"149":22,"151":22,"153":22,"155":22,"157":22,"159":22,"161":22,"163":22,"165":22,"167":22,"168":22,"174":22,"176":22,"178":22,"180":22,"182":22,"184":22,"186":22,"188":22,"190":22,"192":22,"194":22,"196":22,"199":22,"201":22,"203":22,"204":212,"205":212,"210":224,"221":212,"223":230,"225":212,"231":212,"233":-268,"234":-269,"235":212,"240":-270,"244":-271,"245":-264,"246":-265,"247":-266,"248":-267,"268":-6,"269":22,"273":22,"275":22,"279":22,"281":22,"285":22,"288":22,"301":320,"312":315,"326":329,"335":22,"340":344,"345":369,"346":22,"347":463,"348":22,"349":22,"354":22,"356":22,"358":566,"359":284,"360":22,"361":212,"362":212,"370":372,"371":385,"373":385,"374":385,"375":-111,"376":-113,"377":385,"378":385,"386":437,"387":-127,"388":-128,"389":-129,"390":444,"391":454,"392":-130,"393":-131,"395":-112,"396":-114,"397":-115,"398":385,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"406":407,"408":22,"411":417,"412":22,"413":435,"414":-123,"420":-124,"439":417,"440":-125,"443":-126,"444":446,"447":448,"455":456,"457":22,"459":22,"461":385,"464":489,"467":22,"468":475,"471":22,"472":22,"476":485,"477":22,"478":481,"482":22,"486":22,"490":499,"491":493,"492":22,"494":22,"500":22,"504":22,"507":22,"508":22,"514":517,"525":22,"530":22,"537":22,"540":22,"549":22,"563":22,"568":569,"570":573,"571":574,"575":576,"577":22,"589":22,"604":212,"607":212,"608":212,"611":212},"13":{"17":285,"62":109,"63":109,"68":-278,"69":-279,"71":109,"204":109,"205":109,"221":109,"225":109,"231":109,"235":109,"340":109,"359":285,"361":109,"362":109,"525":529,"537":539,"604":109,"607":109,"608":109,"611":109},"14":{"0":53,"2":53,"3":-3,"5":76,"8":53,"10":53,"11":53,"17":53,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"27":53,"28":-41,"29":53,"30":-43,"31":-44,"32":53,"33":-55,"34":-56,"35":53,"37":53,"38":53,"39":53,"43":168,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":53,"54":53,"55":53,"56":53,"57":53,"58":53,"59":53,"60":53,"61":53,"65":-4,"66":-5,"67":53,"68":-278,"69":-279,"70":76,"71":53,"72":53,"73":53,"74":53,"75":53,"76":53,"77":-57,"78":53,"79":53,"80":53,"81":53,"82":53,"83":53,"84":53,"85":53,"86":76,"87":-48,"88":-35,"89":-36,"90":53,"91":-283,"92":-282,"98":53,"108":168,"119":53,"123":53,"124":-47,"125":53,"126":76,"127":53,"128":76,"129":-40,"130":53,"131":76,"132":53,"133":76,"134":53,"135":76,"136":53,"137":76,"138":53,"139":76,"140":53,"141":76,"142":53,"143":76,"144":53,"145":76,"146":53,"147":-62,"148":76,"149":53,"150":76,"151":53,"152":76,"153":53,"154":76,"155":53,"156":76,"157":53,"158":76,"159":53,"160":76,"161":53,"162":76,"163":53,"164":76,"165":53,"166":76,"167":53,"168":53,"169":76,"170":-194,"172":76,"173":-195,"174":53,"175":76,"176":53,"177":76,"178":53,"179":76,"180":53,"181":76,"182":53,"183":76,"184":53,"185":76,"186":53,"187":76,"188":53,"189":76,"190":53,"191":76,"192":53,"193":76,"194":53,"195":76,"196":53,"197":-65,"198":76,"199":53,"200":76,"201":53,"202":76,"203":53,"204":-253,"205":-257,"206":76,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"224":235,"228":-263,"230":235,"249":-258,"250":-259,"251":-260,"252":-51,"253":76,"254":-52,"255":76,"256":76,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"268":-6,"269":53,"270":76,"271":76,"272":76,"273":53,"274":76,"275":53,"276":76,"277":76,"279":53,"280":-7,"281":53,"282":-8,"284":288,"285":53,"286":76,"288":53,"289":76,"292":76,"293":76,"294":76,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":76,"335":53,"339":76,"340":53,"344":-35,"346":53,"347":53,"348":53,"349":53,"351":-36,"354":53,"356":53,"359":53,"360":53,"363":-210,"385":411,"408":53,"409":76,"411":53,"412":53,"422":-91,"426":-92,"430":-93,"433":-94,"434":76,"437":439,"439":53,"457":53,"458":76,"459":53,"460":76,"463":-35,"466":76,"467":53,"469":76,"471":53,"472":53,"473":76,"474":76,"477":53,"479":76,"482":53,"483":76,"486":53,"487":76,"492":53,"494":53,"495":76,"497":76,"500":53,"501":76,"504":53,"505":76,"507":53,"508":53,"509":76,"510":76,"511":76,"524":76,"525":53,"530":53,"535":76,"537":53,"540":53,"549":53,"550":76,"563":53,"564":76,"577":53,"580":76,"582":-196,"584":76,"588":-197,"589":53,"590":76,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"15":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"53":416,"71":-45,"76":257,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"168":170,"169":-238,"170":-194,"171":173,"172":-84,"173":-195,"175":-85,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"237":238,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"258":259,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"289":290,"293":-42,"298":-49,"299":-50,"303":-88,"305":-101,"306":-102,"307":-103,"310":-106,"314":-89,"315":-96,"317":-98,"318":-104,"319":-105,"320":-95,"322":-97,"324":-87,"328":-90,"329":-99,"331":-100,"363":-210,"411":416,"415":419,"417":423,"418":431,"422":-91,"426":-92,"427":428,"430":-93,"433":-94,"439":416,"441":442,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"16":{"0":19,"2":19,"3":-3,"51":585,"65":-4,"66":-5,"68":-278,"69":-279,"268":-6,"279":19,"281":19,"340":19,"362":367,"371":379,"373":379,"374":379,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":379,"525":532,"537":542,"589":591,"607":367},"17":{"0":20,"2":20,"3":-3,"51":586,"65":-4,"66":-5,"68":-278,"69":-279,"268":-6,"279":20,"281":20,"340":20,"362":368,"371":380,"373":380,"374":380,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":380,"525":533,"537":543,"589":592,"607":368},"18":{"0":21,"2":21,"3":-3,"51":587,"65":-4,"66":-5,"68":-278,"69":-279,"210":226,"223":232,"233":-268,"234":-269,"240":-270,"244":-271,"245":-264,"246":-265,"247":-266,"248":-267,"268":-6,"279":21,"281":21,"340":21,"362":366,"371":381,"373":381,"374":381,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":381,"525":534,"537":544,"589":593,"607":366},"19":{"0":23,"2":23,"3":-3,"8":23,"10":23,"11":23,"17":23,"27":23,"29":23,"32":23,"35":23,"37":23,"38":23,"39":23,"51":23,"54":23,"55":23,"56":23,"57":23,"58":23,"59":23,"60":23,"61":23,"62":216,"63":216,"65":-4,"66":-5,"67":23,"68":-278,"69":-279,"71":89,"72":23,"73":23,"74":23,"75":23,"76":23,"78":23,"79":23,"80":23,"81":23,"82":23,"83":23,"84":23,"85":23,"90":23,"98":23,"119":23,"123":23,"125":23,"127":23,"130":23,"132":23,"134":23,"136":23,"138":23,"140":23,"142":23,"144":23,"146":23,"149":23,"151":23,"153":23,"155":23,"157":23,"159":23,"161":23,"163":23,"165":23,"167":23,"168":23,"174":23,"176":23,"178":23,"180":23,"182":23,"184":23,"186":23,"188":23,"190":23,"192":23,"194":23,"196":23,"199":23,"201":23,"203":23,"204":216,"205":216,"221":216,"225":216,"231":216,"235":216,"268":-6,"269":23,"273":23,"275":23,"279":23,"281":23,"285":23,"288":23,"335":23,"340":351,"346":23,"347":23,"348":23,"349":23,"354":23,"356":23,"359":23,"360":23,"361":216,"362":216,"408":23,"412":23,"457":23,"459":23,"467":23,"471":23,"472":23,"477":23,"482":23,"486":23,"492":23,"494":23,"500":23,"504":23,"507":23,"508":23,"525":23,"530":23,"537":23,"540":23,"549":23,"563":23,"577":23,"589":23,"604":216,"607":216,"608":216,"611":216},"20":{"0":27,"2":27,"3":-3,"8":27,"10":27,"11":27,"17":27,"27":27,"29":27,"32":27,"35":27,"37":27,"38":27,"39":27,"51":27,"54":27,"55":27,"56":27,"57":27,"58":27,"59":27,"60":27,"61":27,"62":214,"63":214,"65":-4,"66":-5,"67":27,"68":-278,"69":-279,"71":90,"72":27,"73":27,"74":27,"75":27,"76":27,"78":27,"79":27,"80":27,"81":27,"82":27,"83":27,"84":27,"85":27,"90":27,"98":27,"119":27,"123":27,"125":27,"127":27,"130":27,"132":27,"134":27,"136":27,"138":27,"140":27,"142":27,"144":27,"146":27,"149":27,"151":27,"153":27,"155":27,"157":27,"159":27,"161":27,"163":27,"165":27,"167":27,"168":27,"174":27,"176":27,"178":27,"180":27,"182":27,"184":27,"186":27,"188":27,"190":27,"192":27,"194":27,"196":27,"199":27,"201":27,"203":27,"204":214,"205":214,"221":214,"225":214,"231":214,"235":214,"268":-6,"269":27,"273":27,"275":27,"279":27,"281":27,"285":27,"288":27,"335":27,"340":349,"346":27,"347":27,"348":27,"349":27,"354":27,"356":27,"359":27,"360":27,"361":214,"362":214,"408":27,"412":27,"457":27,"459":27,"467":27,"471":27,"472":27,"477":27,"482":27,"486":27,"492":27,"494":27,"500":27,"504":27,"507":27,"508":27,"525":27,"530":27,"537":27,"540":27,"549":27,"563":27,"577":27,"589":27,"604":214,"607":214,"608":214,"611":214},"21":{"0":29,"2":29,"3":-3,"8":29,"10":29,"11":29,"17":29,"27":29,"29":29,"32":29,"35":29,"37":29,"38":29,"39":29,"51":29,"54":29,"55":29,"56":29,"57":29,"58":29,"59":29,"60":29,"61":29,"65":-4,"66":-5,"67":29,"68":-278,"69":-279,"71":29,"72":29,"73":29,"74":29,"75":29,"76":29,"78":29,"79":29,"80":29,"81":29,"82":29,"83":29,"84":29,"85":29,"90":29,"98":29,"119":29,"123":29,"125":29,"127":29,"130":29,"132":29,"134":29,"136":29,"138":29,"140":29,"142":29,"144":29,"146":29,"149":29,"151":29,"153":29,"155":29,"157":29,"159":29,"161":29,"163":29,"165":29,"167":29,"168":29,"174":29,"176":29,"178":29,"180":29,"182":29,"184":29,"186":29,"188":29,"190":29,"192":29,"194":29,"196":29,"199":29,"201":29,"203":29,"268":-6,"269":29,"273":29,"275":29,"279":29,"281":29,"285":29,"288":29,"335":29,"340":29,"346":29,"347":29,"348":29,"349":29,"354":29,"356":29,"359":29,"360":29,"408":29,"412":29,"457":29,"459":29,"467":29,"471":29,"472":29,"477":29,"482":29,"486":29,"492":29,"494":29,"500":29,"504":29,"507":29,"508":29,"525":29,"530":29,"537":29,"540":29,"549":29,"563":29,"577":29,"589":29},"22":{"5":71,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":71,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"172":71,"173":-195,"175":71,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":71,"254":-52,"255":71,"256":71,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"270":71,"271":71,"272":71,"274":71,"276":71,"277":71,"280":-7,"282":-8,"284":-35,"286":71,"289":71,"292":71,"293":71,"294":71,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":71,"339":71,"344":-35,"351":-36,"363":-210,"409":71,"422":-91,"426":-92,"430":-93,"433":-94,"434":71,"458":71,"460":71,"463":-35,"466":71,"469":71,"473":71,"474":71,"479":71,"483":71,"487":71,"495":71,"497":71,"501":71,"505":71,"509":71,"510":71,"511":71,"524":71,"535":71,"550":71,"564":71,"580":71,"582":-196,"584":71,"588":-197,"590":71,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"23":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"71":-45,"77":-57,"86":123,"87":-48,"88":125,"89":127,"90":130,"91":132,"92":134,"93":136,"94":138,"95":140,"96":142,"97":144,"98":146,"99":149,"100":151,"101":153,"102":155,"103":157,"104":159,"105":161,"106":163,"107":165,"108":167,"109":176,"110":178,"111":180,"112":182,"113":184,"114":186,"115":188,"116":190,"117":192,"118":194,"119":196,"120":199,"121":201,"122":203,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"211":132,"212":125,"213":134,"214":130,"215":146,"216":127,"217":167,"218":196,"219":203,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"344":125,"345":136,"346":138,"347":142,"348":144,"349":130,"350":149,"351":127,"352":157,"353":159,"354":161,"355":163,"356":165,"357":178,"358":182,"359":184,"360":188,"363":-210,"369":370,"422":-91,"426":-92,"430":-93,"433":-94,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"24":{"0":32,"2":32,"3":-3,"8":32,"10":32,"11":32,"17":32,"27":32,"29":32,"32":32,"35":32,"37":32,"38":32,"39":32,"51":32,"54":32,"55":32,"56":32,"57":32,"58":32,"59":32,"60":32,"61":32,"65":-4,"66":-5,"67":32,"68":-278,"69":-279,"71":32,"72":32,"73":32,"74":32,"75":32,"76":32,"78":32,"79":32,"80":32,"81":32,"82":32,"83":32,"84":32,"85":32,"90":32,"98":32,"119":32,"123":32,"125":32,"127":32,"130":32,"132":32,"134":32,"136":32,"138":32,"140":32,"142":32,"144":32,"146":32,"149":32,"151":32,"153":32,"155":32,"157":32,"159":32,"161":32,"163":32,"165":32,"167":32,"168":32,"174":32,"176":32,"178":32,"180":32,"182":32,"184":32,"186":32,"188":32,"190":32,"192":32,"194":32,"196":32,"199":32,"201":32,"203":32,"268":-6,"269":32,"273":32,"275":32,"279":32,"281":32,"285":32,"288":32,"335":32,"340":32,"346":32,"347":32,"348":32,"349":32,"354":32,"356":32,"359":32,"360":32,"385":413,"408":32,"411":413,"412":32,"437":413,"439":413,"457":32,"459":32,"467":32,"471":32,"472":32,"477":32,"482":32,"486":32,"492":32,"494":32,"500":32,"504":32,"507":32,"508":32,"525":32,"530":32,"537":32,"540":32,"549":32,"563":32,"577":32,"589":32},"25":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"32":296,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"294":298,"295":299,"297":325,"298":-49,"299":-50,"303":-88,"304":311,"305":-101,"306":-102,"307":-103,"310":-106,"314":-89,"315":-96,"317":-98,"318":-104,"319":-105,"320":-95,"322":-97,"324":-87,"328":-90,"329":-99,"331":-100,"363":-210,"413":296,"422":-91,"426":-92,"430":-93,"433":-94,"435":436,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"26":{"5":72,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":72,"71":-45,"77":-57,"86":72,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":72,"126":72,"128":72,"129":72,"131":72,"133":72,"135":72,"137":72,"139":72,"141":72,"143":72,"145":72,"147":72,"148":72,"150":72,"152":72,"154":72,"156":72,"158":72,"160":72,"162":72,"164":72,"166":72,"169":72,"170":-194,"172":72,"173":-195,"175":72,"177":72,"179":72,"181":72,"183":72,"185":72,"187":72,"189":72,"191":72,"193":72,"195":72,"197":72,"198":72,"200":72,"202":72,"204":-253,"205":-257,"206":72,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":72,"254":-52,"255":72,"256":72,"257":-82,"259":-83,"260":72,"261":72,"262":72,"263":72,"264":72,"265":72,"266":72,"267":72,"270":72,"271":72,"272":72,"274":72,"276":72,"277":72,"280":-7,"282":-8,"284":-35,"286":72,"289":72,"292":72,"293":72,"294":72,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":72,"339":72,"344":-35,"351":-36,"363":-210,"409":72,"422":-91,"426":-92,"430":-93,"433":-94,"434":72,"458":72,"460":72,"463":-35,"466":72,"469":72,"473":72,"474":72,"479":72,"483":72,"487":72,"495":72,"497":72,"501":72,"505":72,"509":72,"510":72,"511":72,"524":72,"535":72,"550":72,"564":72,"580":72,"582":-196,"584":72,"588":-197,"590":72,"594":-86,"595":72,"596":-59,"597":-60,"598":72,"599":72,"600":72,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"27":{"0":51,"2":51,"3":-3,"5":73,"8":51,"10":51,"11":51,"17":51,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"27":51,"28":-41,"29":51,"30":-43,"31":-44,"32":51,"33":-55,"34":-56,"35":51,"37":51,"38":51,"39":51,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":51,"54":51,"55":51,"56":51,"57":51,"58":51,"59":51,"60":51,"61":51,"65":-4,"66":-5,"67":51,"68":-278,"69":-279,"70":73,"71":51,"72":51,"73":51,"74":51,"75":51,"76":51,"77":-57,"78":51,"79":51,"80":51,"81":51,"82":51,"83":51,"84":51,"85":51,"86":73,"87":-48,"88":-35,"89":-36,"90":51,"91":-283,"92":-282,"98":51,"108":-193,"119":51,"123":51,"124":73,"125":51,"126":73,"127":51,"128":73,"129":73,"130":51,"131":73,"132":51,"133":73,"134":51,"135":73,"136":51,"137":73,"138":51,"139":73,"140":51,"141":73,"142":51,"143":73,"144":51,"145":73,"146":51,"147":73,"148":73,"149":51,"150":73,"151":51,"152":73,"153":51,"154":73,"155":51,"156":73,"157":51,"158":73,"159":51,"160":73,"161":51,"162":73,"163":51,"164":73,"165":51,"166":73,"167":51,"168":51,"169":73,"170":-194,"172":73,"173":-195,"174":51,"175":73,"176":51,"177":73,"178":51,"179":73,"180":51,"181":73,"182":51,"183":73,"184":51,"185":73,"186":51,"187":73,"188":51,"189":73,"190":51,"191":73,"192":51,"193":73,"194":51,"195":73,"196":51,"197":73,"198":73,"199":51,"200":73,"201":51,"202":73,"203":51,"204":-253,"205":-257,"206":73,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":73,"254":-52,"255":73,"256":73,"257":-82,"259":-83,"260":73,"261":73,"262":73,"263":73,"264":73,"265":73,"266":73,"267":73,"268":-6,"269":51,"270":73,"271":73,"272":73,"273":51,"274":73,"275":51,"276":73,"277":73,"279":51,"280":-7,"281":51,"282":-8,"284":-35,"285":51,"286":73,"288":51,"289":73,"292":73,"293":73,"294":73,"295":-35,"298":-49,"299":-50,"300":51,"303":-88,"314":-89,"316":51,"321":51,"324":-87,"328":-90,"330":51,"332":73,"335":51,"339":73,"340":51,"344":-35,"346":51,"347":51,"348":51,"349":51,"351":-36,"354":51,"356":51,"359":51,"360":51,"363":-210,"408":51,"409":73,"412":51,"422":-91,"424":51,"426":-92,"430":-93,"433":-94,"434":73,"457":51,"458":73,"459":51,"460":73,"463":-35,"466":73,"467":51,"469":73,"471":51,"472":51,"473":73,"474":73,"477":51,"479":73,"482":51,"483":73,"486":51,"487":73,"492":51,"494":51,"495":73,"497":73,"500":51,"501":73,"504":51,"505":73,"507":51,"508":51,"509":73,"510":73,"511":73,"524":73,"525":51,"530":51,"535":73,"537":51,"540":51,"549":51,"550":73,"563":51,"564":73,"577":51,"580":73,"582":-196,"584":73,"588":-197,"589":51,"590":73,"594":-86,"595":73,"596":-59,"597":-60,"598":73,"599":73,"600":73,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"28":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":582,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":254,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"363":-210,"422":-91,"426":-92,"430":-93,"433":-94,"582":-196,"583":588,"584":-198,"585":-199,"586":-200,"587":-201,"588":-197,"590":-202,"591":-203,"592":-204,"593":-205,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"29":{"5":74,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":74,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"172":74,"173":-195,"175":74,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":74,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"270":74,"271":74,"272":74,"274":74,"276":74,"277":74,"280":-7,"282":-8,"284":-35,"286":74,"289":74,"292":74,"293":-42,"294":74,"295":300,"298":-49,"299":-50,"303":-88,"314":-89,"315":316,"320":321,"324":-87,"328":-90,"329":330,"332":74,"339":74,"344":-35,"351":-36,"363":-210,"385":412,"407":408,"409":74,"417":424,"422":-91,"426":-92,"430":-93,"433":-94,"434":74,"435":300,"446":451,"448":449,"454":459,"456":457,"458":74,"460":74,"463":-35,"466":74,"469":74,"473":74,"474":74,"479":74,"483":74,"487":74,"495":74,"497":74,"501":74,"505":74,"509":74,"510":74,"511":74,"524":74,"535":74,"550":74,"564":74,"580":74,"582":-196,"584":74,"588":-197,"590":74,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"30":{"5":75,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":75,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"172":75,"173":-195,"175":75,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":75,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"270":75,"271":75,"272":75,"274":75,"276":75,"277":75,"280":-7,"282":-8,"284":-35,"286":75,"289":75,"292":75,"293":-42,"294":75,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":75,"339":75,"344":-35,"351":-36,"363":-210,"409":75,"422":-91,"426":-92,"430":-93,"433":-94,"434":75,"458":75,"460":75,"463":-35,"466":75,"469":75,"473":75,"474":75,"479":75,"483":75,"487":75,"495":75,"497":75,"501":75,"505":75,"509":75,"510":75,"511":75,"524":75,"535":75,"550":75,"564":75,"580":75,"582":-196,"584":75,"588":-197,"590":75,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"31":{"0":54,"2":54,"3":-3,"5":77,"8":54,"10":54,"11":54,"17":54,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"27":54,"28":-41,"29":54,"30":-43,"31":-44,"32":54,"33":-55,"34":-56,"35":54,"37":54,"38":54,"39":54,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":54,"54":54,"55":54,"56":54,"57":54,"58":54,"59":54,"60":54,"61":54,"65":-4,"66":-5,"67":54,"68":-278,"69":-279,"70":77,"71":54,"72":54,"73":54,"74":54,"75":54,"76":54,"77":-57,"78":54,"79":54,"80":54,"81":54,"82":54,"83":54,"84":54,"85":54,"86":77,"87":-48,"88":-35,"89":-36,"90":54,"91":-283,"92":-282,"98":54,"108":-193,"119":54,"123":54,"124":77,"125":54,"126":77,"127":54,"128":77,"129":77,"130":54,"131":77,"132":54,"133":77,"134":54,"135":77,"136":54,"137":77,"138":54,"139":77,"140":54,"141":77,"142":54,"143":77,"144":54,"145":77,"146":54,"147":77,"148":77,"149":54,"150":77,"151":54,"152":77,"153":54,"154":77,"155":54,"156":77,"157":54,"158":77,"159":54,"160":77,"161":54,"162":77,"163":54,"164":77,"165":54,"166":77,"167":54,"168":54,"169":77,"170":-194,"172":77,"173":-195,"174":54,"175":77,"176":54,"177":77,"178":54,"179":77,"180":54,"181":77,"182":54,"183":77,"184":54,"185":77,"186":54,"187":77,"188":54,"189":77,"190":54,"191":77,"192":54,"193":77,"194":54,"195":77,"196":54,"197":77,"198":77,"199":54,"200":77,"201":54,"202":77,"203":54,"204":-253,"205":-257,"206":77,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":77,"254":-52,"255":77,"256":77,"257":-82,"259":-83,"260":77,"261":77,"262":77,"263":77,"264":77,"265":77,"266":77,"267":77,"268":-6,"269":54,"270":77,"271":77,"272":77,"273":54,"274":77,"275":54,"276":77,"277":77,"279":54,"280":-7,"281":54,"282":-8,"284":-35,"285":54,"286":77,"288":54,"289":77,"292":77,"293":77,"294":77,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":77,"335":54,"339":77,"340":54,"344":-35,"346":54,"347":54,"348":54,"349":54,"351":-36,"354":54,"356":54,"359":54,"360":54,"363":-210,"408":54,"409":77,"412":54,"422":-91,"426":-92,"430":-93,"433":-94,"434":77,"457":54,"458":77,"459":54,"460":77,"463":-35,"466":77,"467":54,"469":77,"471":54,"472":54,"473":77,"474":77,"477":54,"479":77,"482":54,"483":77,"486":54,"487":77,"492":54,"494":54,"495":77,"497":77,"500":54,"501":77,"504":54,"505":77,"507":54,"508":54,"509":77,"510":77,"511":77,"524":77,"525":54,"530":54,"535":77,"537":54,"540":54,"549":54,"550":77,"563":54,"564":77,"577":54,"580":77,"582":-196,"584":77,"588":-197,"589":54,"590":77,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":77,"600":77,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"32":{"0":55,"2":55,"3":-3,"5":79,"8":55,"10":55,"11":55,"17":55,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"27":55,"28":-41,"29":55,"30":-43,"31":-44,"32":55,"33":-55,"34":-56,"35":55,"37":55,"38":55,"39":55,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":55,"54":55,"55":55,"56":55,"57":55,"58":55,"59":55,"60":55,"61":55,"65":-4,"66":-5,"67":55,"68":-278,"69":-279,"70":79,"71":55,"72":55,"73":55,"74":55,"75":55,"76":55,"77":-57,"78":55,"79":55,"80":55,"81":55,"82":55,"83":55,"84":55,"85":55,"86":79,"87":-48,"88":-35,"89":-36,"90":55,"91":-283,"92":-282,"98":55,"108":-193,"119":55,"123":55,"124":79,"125":55,"126":79,"127":55,"128":79,"129":-40,"130":55,"131":79,"132":55,"133":79,"134":55,"135":79,"136":55,"137":79,"138":55,"139":79,"140":55,"141":79,"142":55,"143":79,"144":55,"145":79,"146":55,"147":-62,"148":79,"149":55,"150":79,"151":55,"152":79,"153":55,"154":79,"155":55,"156":79,"157":55,"158":79,"159":55,"160":79,"161":55,"162":79,"163":55,"164":79,"165":55,"166":79,"167":55,"168":55,"169":79,"170":-194,"172":79,"173":-195,"174":55,"175":79,"176":55,"177":79,"178":55,"179":79,"180":55,"181":79,"182":55,"183":79,"184":55,"185":79,"186":55,"187":79,"188":55,"189":79,"190":55,"191":79,"192":55,"193":79,"194":55,"195":79,"196":55,"197":-65,"198":79,"199":55,"200":79,"201":55,"202":79,"203":55,"204":-253,"205":-257,"206":79,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":79,"254":-52,"255":79,"256":79,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":79,"266":79,"267":-73,"268":-6,"269":55,"270":79,"271":79,"272":79,"273":55,"274":79,"275":55,"276":79,"277":79,"279":55,"280":-7,"281":55,"282":-8,"284":-35,"285":55,"286":79,"288":55,"289":79,"292":79,"293":79,"294":79,"295":-35,"298":-49,"299":-50,"300":309,"303":-88,"314":-89,"316":309,"321":309,"324":-87,"328":-90,"330":309,"332":79,"335":55,"339":79,"340":55,"344":-35,"346":55,"347":55,"348":55,"349":55,"351":-36,"354":55,"356":55,"359":55,"360":55,"363":-210,"408":55,"409":79,"412":55,"422":-91,"424":309,"426":-92,"430":-93,"433":-94,"434":79,"457":55,"458":79,"459":55,"460":79,"463":-35,"466":79,"467":55,"469":79,"471":55,"472":55,"473":79,"474":79,"477":55,"479":79,"482":55,"483":79,"486":55,"487":79,"492":55,"494":55,"495":79,"497":79,"500":55,"501":79,"504":55,"505":79,"507":55,"508":55,"509":79,"510":79,"511":79,"524":79,"525":55,"530":55,"535":79,"537":55,"540":55,"549":55,"550":79,"563":55,"564":79,"577":55,"580":79,"582":-196,"584":79,"588":-197,"589":55,"590":79,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"33":{"0":56,"2":56,"3":-3,"5":80,"8":56,"10":56,"11":56,"17":56,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"27":56,"28":-41,"29":56,"30":-43,"31":-44,"32":56,"33":-55,"34":-56,"35":56,"37":56,"38":56,"39":56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"51":56,"54":56,"55":56,"56":56,"57":56,"58":56,"59":56,"60":56,"61":56,"65":-4,"66":-5,"67":56,"68":-278,"69":-279,"70":80,"71":56,"72":56,"73":56,"74":56,"75":56,"76":56,"77":-57,"78":56,"79":56,"80":56,"81":56,"82":56,"83":56,"84":56,"85":56,"86":80,"87":-48,"88":-35,"89":-36,"90":56,"91":-283,"92":-282,"98":56,"108":-193,"119":56,"123":56,"124":80,"125":56,"126":80,"127":56,"128":80,"129":-40,"130":56,"131":80,"132":56,"133":80,"134":56,"135":80,"136":56,"137":80,"138":56,"139":80,"140":56,"141":80,"142":56,"143":80,"144":56,"145":80,"146":56,"147":-62,"148":80,"149":56,"150":80,"151":56,"152":80,"153":56,"154":80,"155":56,"156":80,"157":56,"158":80,"159":56,"160":80,"161":56,"162":80,"163":56,"164":80,"165":56,"166":80,"167":56,"168":56,"169":80,"170":-194,"172":80,"173":-195,"174":56,"175":80,"176":56,"177":80,"178":56,"179":80,"180":56,"181":80,"182":56,"183":80,"184":56,"185":80,"186":56,"187":80,"188":56,"189":80,"190":56,"191":80,"192":56,"193":80,"194":56,"195":80,"196":56,"197":-65,"198":80,"199":56,"200":80,"201":56,"202":80,"203":56,"204":-253,"205":-257,"206":80,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":80,"254":-52,"255":80,"256":80,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":80,"266":80,"267":-73,"268":-6,"269":56,"270":80,"271":80,"272":80,"273":56,"274":80,"275":56,"276":80,"277":80,"279":56,"280":-7,"281":56,"282":-8,"284":-35,"285":56,"286":80,"288":56,"289":80,"292":80,"293":80,"294":80,"295":-35,"298":-49,"299":-50,"300":308,"303":-88,"314":-89,"316":308,"321":308,"324":-87,"328":-90,"330":308,"332":80,"335":56,"339":80,"340":56,"344":-35,"346":56,"347":56,"348":56,"349":56,"351":-36,"354":56,"356":56,"359":56,"360":56,"363":-210,"408":56,"409":80,"412":56,"422":-91,"424":308,"426":-92,"430":-93,"433":-94,"434":80,"457":56,"458":80,"459":56,"460":80,"463":-35,"466":80,"467":56,"469":80,"471":56,"472":56,"473":80,"474":80,"477":56,"479":80,"482":56,"483":80,"486":56,"487":80,"492":56,"494":56,"495":80,"497":80,"500":56,"501":80,"504":56,"505":80,"507":56,"508":56,"509":80,"510":80,"511":80,"524":80,"525":56,"530":56,"535":80,"537":56,"540":56,"549":56,"550":80,"563":56,"564":80,"577":56,"580":80,"582":-196,"584":80,"588":-197,"589":56,"590":80,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"34":{"0":57,"2":57,"3":-3,"8":57,"10":57,"11":57,"17":57,"27":57,"29":57,"32":57,"35":57,"37":57,"38":57,"39":57,"51":57,"54":57,"55":57,"56":57,"57":57,"58":57,"59":57,"60":57,"61":57,"65":-4,"66":-5,"67":57,"68":-278,"69":-279,"71":57,"72":57,"73":57,"74":57,"75":57,"76":57,"78":57,"79":57,"80":57,"81":57,"82":57,"83":57,"84":57,"85":57,"90":57,"98":57,"119":57,"123":57,"125":57,"127":57,"130":57,"132":57,"134":57,"136":57,"138":57,"140":57,"142":57,"144":57,"146":57,"149":57,"151":57,"153":57,"155":57,"157":57,"159":57,"161":57,"163":57,"165":57,"167":57,"168":57,"174":57,"176":57,"178":57,"180":57,"182":57,"184":57,"186":57,"188":57,"190":57,"192":57,"194":57,"196":57,"199":57,"201":57,"203":57,"268":-6,"269":57,"273":57,"275":57,"279":57,"281":57,"285":57,"288":57,"335":57,"340":57,"346":57,"347":57,"348":57,"349":57,"354":57,"356":57,"359":57,"360":57,"408":57,"412":57,"457":57,"459":57,"467":57,"471":57,"472":57,"477":57,"482":57,"486":57,"492":57,"494":57,"500":57,"504":57,"507":57,"508":57,"525":57,"530":57,"537":57,"540":57,"549":57,"563":57,"577":57,"589":57},"35":{"0":58,"2":58,"3":-3,"8":58,"10":58,"11":58,"17":58,"27":58,"29":58,"32":58,"35":58,"37":58,"38":58,"39":58,"51":58,"54":58,"55":58,"56":58,"57":58,"58":58,"59":58,"60":58,"61":58,"62":215,"63":215,"65":-4,"66":-5,"67":58,"68":-278,"69":-279,"71":98,"72":58,"73":58,"74":58,"75":58,"76":58,"78":58,"79":58,"80":58,"81":58,"82":58,"83":58,"84":58,"85":58,"90":58,"98":58,"119":58,"123":58,"125":58,"127":58,"130":58,"132":58,"134":58,"136":58,"138":58,"140":58,"142":58,"144":58,"146":58,"149":58,"151":58,"153":58,"155":58,"157":58,"159":58,"161":58,"163":58,"165":58,"167":58,"168":58,"174":58,"176":58,"178":58,"180":58,"182":58,"184":58,"186":58,"188":58,"190":58,"192":58,"194":58,"196":58,"199":58,"201":58,"203":58,"204":215,"205":215,"221":215,"225":215,"231":215,"235":215,"268":-6,"269":58,"273":58,"275":58,"279":58,"281":58,"285":58,"288":58,"335":58,"340":98,"346":58,"347":58,"348":58,"349":58,"354":58,"356":58,"359":58,"360":58,"361":215,"362":215,"408":58,"412":58,"457":58,"459":58,"467":58,"471":58,"472":58,"477":58,"482":58,"486":58,"492":58,"494":58,"500":58,"504":58,"507":58,"508":58,"525":58,"530":58,"537":58,"540":58,"549":58,"563":58,"577":58,"589":58,"604":215,"607":215,"608":215,"611":215},"36":{"0":59,"2":59,"3":-3,"8":59,"10":59,"11":59,"17":59,"27":59,"29":59,"32":59,"35":59,"37":59,"38":59,"39":59,"51":59,"54":59,"55":59,"56":59,"57":59,"58":59,"59":59,"60":59,"61":59,"65":-4,"66":-5,"67":59,"68":-278,"69":-279,"71":59,"72":59,"73":59,"74":59,"75":59,"76":59,"78":59,"79":59,"80":59,"81":59,"82":59,"83":59,"84":59,"85":59,"90":59,"98":59,"119":59,"123":59,"125":59,"127":59,"130":59,"132":59,"134":59,"136":59,"138":59,"140":59,"142":59,"144":59,"146":59,"149":59,"151":59,"153":59,"155":59,"157":59,"159":59,"161":59,"163":59,"165":59,"167":59,"168":59,"174":59,"176":59,"178":59,"180":59,"182":59,"184":59,"186":59,"188":59,"190":59,"192":59,"194":59,"196":59,"199":59,"201":59,"203":59,"268":-6,"269":59,"273":59,"275":59,"279":59,"281":59,"285":59,"288":59,"335":59,"340":59,"346":59,"347":59,"348":59,"349":59,"354":59,"356":59,"359":59,"360":59,"408":59,"412":59,"457":59,"459":59,"467":59,"471":59,"472":59,"477":59,"482":59,"486":59,"492":59,"494":59,"500":59,"504":59,"507":59,"508":59,"525":59,"530":59,"537":59,"540":59,"549":59,"563":59,"577":59,"589":59},"37":{"0":60,"2":60,"3":-3,"8":60,"10":60,"11":60,"17":60,"27":60,"29":60,"32":60,"35":60,"37":60,"38":60,"39":60,"51":60,"54":60,"55":60,"56":60,"57":60,"58":60,"59":60,"60":60,"61":60,"65":-4,"66":-5,"67":60,"68":-278,"69":-279,"71":60,"72":60,"73":60,"74":60,"75":60,"76":60,"78":60,"79":60,"80":60,"81":60,"82":60,"83":60,"84":60,"85":60,"90":60,"98":60,"119":60,"123":60,"125":60,"127":60,"130":60,"132":60,"134":60,"136":60,"138":60,"140":60,"142":60,"144":60,"146":60,"149":60,"151":60,"153":60,"155":60,"157":60,"159":60,"161":60,"163":60,"165":60,"167":60,"168":60,"174":60,"176":60,"178":60,"180":60,"182":60,"184":60,"186":60,"188":60,"190":60,"192":60,"194":60,"196":60,"199":60,"201":60,"203":60,"268":-6,"269":60,"273":60,"275":60,"279":60,"281":60,"285":60,"288":60,"335":60,"340":60,"346":60,"347":60,"348":60,"349":60,"354":60,"356":60,"359":60,"360":60,"408":60,"412":60,"457":60,"459":60,"467":60,"471":60,"472":60,"477":60,"482":60,"486":60,"492":60,"494":60,"500":60,"504":60,"507":60,"508":60,"525":60,"530":60,"537":60,"540":60,"549":60,"563":60,"577":60,"589":60},"38":{"0":61,"2":61,"3":-3,"8":61,"10":61,"11":61,"17":61,"27":61,"29":61,"32":61,"35":61,"37":61,"38":61,"39":61,"51":61,"54":61,"55":61,"56":61,"57":61,"58":61,"59":61,"60":61,"61":61,"62":218,"63":218,"65":-4,"66":-5,"67":61,"68":-278,"69":-279,"71":119,"72":61,"73":61,"74":61,"75":61,"76":61,"78":61,"79":61,"80":61,"81":61,"82":61,"83":61,"84":61,"85":61,"90":61,"98":61,"119":61,"123":61,"125":61,"127":61,"130":61,"132":61,"134":61,"136":61,"138":61,"140":61,"142":61,"144":61,"146":61,"149":61,"151":61,"153":61,"155":61,"157":61,"159":61,"161":61,"163":61,"165":61,"167":61,"168":61,"174":61,"176":61,"178":61,"180":61,"182":61,"184":61,"186":61,"188":61,"190":61,"192":61,"194":61,"196":61,"199":61,"201":61,"203":61,"204":218,"205":218,"221":218,"225":218,"231":218,"235":218,"268":-6,"269":61,"273":61,"275":61,"279":61,"281":61,"285":61,"288":61,"335":61,"340":119,"346":61,"347":61,"348":61,"349":61,"354":61,"356":61,"359":61,"360":61,"361":218,"362":218,"408":61,"412":61,"457":61,"459":61,"467":61,"471":61,"472":61,"477":61,"482":61,"486":61,"492":61,"494":61,"500":61,"504":61,"507":61,"508":61,"525":61,"530":61,"537":61,"540":61,"549":61,"563":61,"577":61,"589":61,"604":218,"607":218,"608":218,"611":218},"39":{"5":78,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":78,"71":-45,"77":-57,"86":78,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":78,"126":78,"128":78,"129":-40,"131":78,"133":78,"135":78,"137":78,"139":78,"141":78,"143":78,"145":78,"147":-62,"148":78,"150":78,"152":78,"154":78,"156":78,"158":78,"160":78,"162":78,"164":78,"166":78,"169":78,"170":-194,"172":78,"173":-195,"175":78,"177":78,"179":78,"181":78,"183":78,"185":78,"187":78,"189":78,"191":78,"193":78,"195":78,"197":-65,"198":78,"200":78,"202":78,"204":-253,"205":-257,"206":78,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":78,"254":-52,"255":78,"256":78,"257":-82,"259":-83,"260":-66,"261":78,"262":78,"263":-69,"264":-70,"265":78,"266":78,"267":-73,"270":78,"271":78,"272":78,"274":78,"276":78,"277":78,"280":-7,"282":-8,"284":-35,"286":78,"289":78,"292":78,"293":78,"294":78,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":78,"339":78,"344":-35,"351":-36,"363":-210,"409":78,"422":-91,"426":-92,"430":-93,"433":-94,"434":78,"458":78,"460":78,"463":-35,"466":78,"469":78,"473":78,"474":78,"479":78,"483":78,"487":78,"495":78,"497":78,"501":78,"505":78,"509":78,"510":78,"511":78,"524":78,"535":78,"550":78,"564":78,"580":78,"582":-196,"584":78,"588":-197,"590":78,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"40":{"5":81,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":81,"71":-45,"77":-57,"86":81,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":81,"126":81,"128":81,"129":81,"131":81,"133":81,"135":81,"137":81,"139":81,"141":81,"143":81,"145":81,"147":81,"148":81,"150":81,"152":81,"154":81,"156":81,"158":81,"160":81,"162":81,"164":81,"166":81,"169":81,"170":-194,"172":81,"173":-195,"175":81,"177":81,"179":81,"181":81,"183":81,"185":81,"187":81,"189":81,"191":81,"193":81,"195":81,"197":81,"198":81,"200":81,"202":81,"204":-253,"205":-257,"206":81,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":81,"254":-52,"255":81,"256":81,"257":-82,"259":-83,"260":81,"261":81,"262":81,"263":-69,"264":81,"265":81,"266":81,"267":-73,"270":81,"271":81,"272":81,"274":81,"276":81,"277":81,"280":-7,"282":-8,"284":-35,"286":81,"289":81,"292":81,"293":81,"294":81,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":81,"339":81,"344":-35,"351":-36,"363":-210,"409":81,"422":-91,"426":-92,"430":-93,"433":-94,"434":81,"458":81,"460":81,"463":-35,"466":81,"469":81,"473":81,"474":81,"479":81,"483":81,"487":81,"495":81,"497":81,"501":81,"505":81,"509":81,"510":81,"511":81,"524":81,"535":81,"550":81,"564":81,"580":81,"582":-196,"584":81,"588":-197,"590":81,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":81,"600":81,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"41":{"5":82,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":82,"71":-45,"77":-57,"86":82,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":82,"126":82,"128":82,"129":-40,"131":82,"133":82,"135":82,"137":82,"139":82,"141":82,"143":82,"145":82,"147":-62,"148":82,"150":82,"152":82,"154":82,"156":82,"158":82,"160":82,"162":82,"164":82,"166":82,"169":82,"170":-194,"172":82,"173":-195,"175":82,"177":82,"179":82,"181":82,"183":82,"185":82,"187":82,"189":82,"191":82,"193":82,"195":82,"197":-65,"198":82,"200":82,"202":82,"204":-253,"205":-257,"206":82,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":82,"254":-52,"255":82,"256":82,"257":-82,"259":-83,"260":82,"261":82,"262":82,"263":-69,"264":-70,"265":82,"266":82,"267":-73,"270":82,"271":82,"272":82,"274":82,"276":82,"277":82,"280":-7,"282":-8,"284":-35,"286":82,"289":82,"292":82,"293":82,"294":82,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":82,"339":82,"344":-35,"351":-36,"363":-210,"409":82,"422":-91,"426":-92,"430":-93,"433":-94,"434":82,"458":82,"460":82,"463":-35,"466":82,"469":82,"473":82,"474":82,"479":82,"483":82,"487":82,"495":82,"497":82,"501":82,"505":82,"509":82,"510":82,"511":82,"524":82,"535":82,"550":82,"564":82,"580":82,"582":-196,"584":82,"588":-197,"590":82,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"42":{"5":83,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":83,"71":-45,"77":-57,"86":83,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":83,"126":83,"128":83,"129":-40,"131":83,"133":83,"135":83,"137":83,"139":83,"141":83,"143":83,"145":83,"147":-62,"148":83,"150":83,"152":83,"154":83,"156":83,"158":83,"160":83,"162":83,"164":83,"166":83,"169":83,"170":-194,"172":83,"173":-195,"175":83,"177":83,"179":83,"181":83,"183":83,"185":83,"187":83,"189":83,"191":83,"193":83,"195":83,"197":-65,"198":83,"200":83,"202":83,"204":-253,"205":-257,"206":83,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":83,"254":-52,"255":83,"256":83,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":83,"267":-73,"270":83,"271":83,"272":83,"274":83,"276":83,"277":83,"280":-7,"282":-8,"284":-35,"286":83,"289":83,"292":83,"293":83,"294":83,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":83,"339":83,"344":-35,"351":-36,"363":-210,"409":83,"422":-91,"426":-92,"430":-93,"433":-94,"434":83,"458":83,"460":83,"463":-35,"466":83,"469":83,"473":83,"474":83,"479":83,"483":83,"487":83,"495":83,"497":83,"501":83,"505":83,"509":83,"510":83,"511":83,"524":83,"535":83,"550":83,"564":83,"580":83,"582":-196,"584":83,"588":-197,"590":83,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"43":{"5":84,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"70":84,"71":-45,"77":-57,"86":84,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":84,"126":84,"128":84,"129":-40,"131":84,"133":84,"135":84,"137":84,"139":84,"141":84,"143":84,"145":84,"147":-62,"148":84,"150":84,"152":84,"154":84,"156":84,"158":84,"160":84,"162":84,"164":84,"166":84,"169":84,"170":-194,"172":84,"173":-195,"175":84,"177":84,"179":84,"181":84,"183":84,"185":84,"187":84,"189":84,"191":84,"193":84,"195":84,"197":-65,"198":84,"200":84,"202":84,"204":-253,"205":-257,"206":84,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"253":84,"254":-52,"255":84,"256":84,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"270":84,"271":84,"272":84,"274":84,"276":84,"277":84,"280":-7,"282":-8,"284":-35,"286":84,"289":84,"292":84,"293":84,"294":84,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":84,"339":84,"344":-35,"351":-36,"363":-210,"409":84,"422":-91,"426":-92,"430":-93,"433":-94,"434":84,"458":84,"460":84,"463":-35,"466":84,"469":84,"473":84,"474":84,"479":84,"483":84,"487":84,"495":84,"497":84,"501":84,"505":84,"509":84,"510":84,"511":84,"524":84,"535":84,"550":84,"564":84,"580":84,"582":-196,"584":84,"588":-197,"590":84,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"44":{"5":85,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":101,"63":101,"68":-278,"69":-279,"70":85,"71":101,"77":-57,"86":85,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":85,"126":85,"128":85,"129":85,"131":85,"133":85,"135":85,"137":85,"139":85,"141":85,"143":85,"145":85,"147":85,"148":85,"150":85,"152":85,"154":85,"156":85,"158":85,"160":85,"162":85,"164":85,"166":85,"169":85,"170":-194,"172":85,"173":-195,"175":85,"177":85,"179":85,"181":85,"183":85,"185":85,"187":85,"189":85,"191":85,"193":85,"195":85,"197":85,"198":85,"200":85,"202":85,"204":101,"205":101,"206":85,"207":-254,"208":-255,"209":-261,"220":-256,"221":101,"222":-262,"225":101,"228":-263,"231":101,"235":101,"249":-258,"250":-259,"251":-260,"252":-51,"253":85,"254":-52,"255":85,"256":85,"257":-82,"259":-83,"260":85,"261":85,"262":85,"263":-69,"264":85,"265":85,"266":85,"267":-73,"270":85,"271":85,"272":85,"274":85,"276":85,"277":85,"280":-7,"282":-8,"284":-35,"286":85,"289":85,"292":85,"293":85,"294":85,"295":-35,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"332":85,"339":85,"340":101,"344":-35,"351":-36,"361":101,"362":101,"363":-210,"409":85,"422":-91,"426":-92,"430":-93,"433":-94,"434":85,"458":85,"460":85,"463":467,"466":85,"469":85,"473":85,"474":85,"475":477,"479":85,"481":482,"483":85,"485":486,"487":85,"489":492,"493":494,"495":85,"497":85,"499":500,"501":85,"505":85,"509":85,"510":85,"511":85,"524":85,"535":85,"550":85,"564":85,"580":85,"582":-196,"584":85,"588":-197,"590":85,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":85,"600":85,"601":-206,"604":101,"605":-207,"606":-208,"607":101,"608":101,"609":-209,"611":101,"614":-211},"45":{"0":42,"2":42,"3":-3,"62":112,"63":112,"65":-4,"66":-5,"68":-278,"69":-279,"71":112,"204":112,"205":112,"221":112,"225":112,"231":112,"235":112,"268":-6,"279":42,"281":42,"340":358,"361":112,"362":112,"604":112,"607":112,"608":112,"611":112},"46":{"0":47,"2":47,"3":-3,"8":47,"10":47,"11":47,"17":47,"27":47,"29":47,"32":47,"35":47,"37":47,"38":47,"39":47,"42":565,"51":47,"54":47,"55":47,"56":47,"57":47,"58":47,"59":47,"60":47,"61":47,"62":211,"63":211,"64":205,"65":-4,"66":-5,"67":47,"68":-278,"69":-279,"71":91,"72":47,"73":47,"74":47,"75":47,"76":47,"78":47,"79":47,"80":47,"81":47,"82":47,"83":47,"84":47,"85":47,"90":47,"98":47,"119":47,"122":205,"123":47,"125":47,"127":47,"130":47,"132":47,"134":47,"136":47,"138":47,"140":47,"142":47,"144":47,"146":47,"149":47,"151":47,"153":47,"155":47,"157":47,"159":47,"161":47,"163":47,"165":47,"167":47,"168":47,"174":47,"176":47,"178":47,"180":47,"182":47,"184":47,"186":47,"188":47,"190":47,"192":47,"194":47,"196":47,"199":47,"201":47,"203":47,"204":211,"205":211,"210":225,"221":211,"223":231,"225":211,"231":211,"233":-268,"234":-269,"235":211,"240":-270,"244":-271,"245":-264,"246":-265,"247":-266,"248":-267,"268":-6,"269":47,"273":47,"275":47,"279":47,"281":47,"285":47,"288":47,"300":47,"308":47,"309":47,"316":47,"321":47,"330":47,"335":47,"340":91,"346":47,"347":47,"348":47,"349":47,"354":47,"356":47,"358":565,"359":47,"360":47,"361":211,"362":211,"408":47,"412":47,"424":47,"449":47,"451":47,"457":47,"459":47,"467":47,"471":47,"472":47,"477":47,"482":47,"486":47,"492":47,"494":47,"500":47,"504":47,"507":47,"508":47,"525":47,"530":47,"537":47,"540":47,"549":47,"563":47,"570":572,"577":47,"589":47,"604":211,"607":211,"608":211,"611":211},"47":{"62":120,"63":120,"68":-278,"69":-279,"71":120,"204":120,"205":120,"221":120,"225":120,"231":120,"235":120,"340":120,"361":120,"362":120,"566":-78,"567":570,"569":-79,"574":-80,"576":-81,"604":120,"607":120,"608":120,"611":120},"48":{"62":118,"63":118,"68":-278,"69":-279,"71":118,"204":118,"205":118,"221":118,"225":118,"231":118,"235":118,"340":118,"361":118,"362":118,"566":568,"574":575,"604":118,"607":118,"608":118,"611":118},"49":{"0":52,"2":52,"3":-3,"8":52,"10":52,"11":52,"17":52,"27":52,"29":52,"32":52,"35":52,"37":52,"38":52,"39":52,"51":52,"54":52,"55":52,"56":52,"57":52,"58":52,"59":52,"60":52,"61":52,"65":-4,"66":-5,"67":52,"68":-278,"69":-279,"71":52,"72":52,"73":52,"74":52,"75":52,"76":52,"78":52,"79":52,"80":52,"81":52,"82":52,"83":52,"84":52,"85":52,"90":52,"98":52,"119":52,"123":52,"125":52,"127":52,"130":52,"132":52,"134":52,"136":52,"138":52,"140":52,"142":52,"144":52,"146":52,"149":52,"151":52,"153":52,"155":52,"157":52,"159":52,"161":52,"163":52,"165":52,"167":52,"168":52,"174":52,"176":52,"178":52,"180":52,"182":52,"184":52,"186":52,"188":52,"190":52,"192":52,"194":52,"196":52,"199":52,"201":52,"203":52,"268":-6,"269":52,"273":52,"275":52,"279":52,"281":52,"285":52,"288":52,"296":323,"299":302,"311":313,"325":327,"335":52,"340":52,"346":52,"347":52,"348":52,"349":52,"354":52,"356":52,"359":52,"360":52,"385":52,"408":52,"411":52,"412":52,"416":421,"423":425,"428":429,"431":432,"436":302,"437":52,"439":52,"457":52,"459":52,"467":52,"471":52,"472":52,"477":52,"482":52,"486":52,"492":52,"494":52,"500":52,"504":52,"507":52,"508":52,"525":52,"530":52,"537":52,"540":52,"549":52,"563":52,"577":52,"589":52},"50":{"0":41,"2":41,"3":-3,"17":41,"62":93,"63":93,"65":-4,"66":-5,"68":-278,"69":-279,"71":93,"204":93,"205":93,"221":93,"225":93,"231":93,"235":93,"268":-6,"279":41,"281":41,"284":41,"285":41,"340":345,"359":41,"361":93,"362":93,"604":93,"607":93,"608":93,"611":93},"51":{"62":114,"63":114,"68":-278,"69":-279,"71":114,"204":114,"205":114,"221":114,"225":114,"231":114,"235":114,"340":114,"361":114,"362":114,"371":377,"373":377,"374":377,"375":-111,"376":-113,"378":398,"387":-127,"388":-128,"389":-129,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":377,"604":114,"607":114,"608":114,"611":114},"52":{"68":-278,"69":-279,"371":387,"373":387,"374":387,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":387},"53":{"68":-278,"69":-279,"371":388,"373":388,"374":388,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":388},"54":{"68":-278,"69":-279,"371":389,"373":389,"374":389,"375":-111,"376":-113,"395":-112,"396":-114,"397":-115,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":389},"55":{"62":116,"63":116,"68":-278,"69":-279,"71":116,"204":116,"205":116,"221":116,"225":116,"231":116,"235":116,"340":116,"361":116,"362":116,"371":392,"373":392,"374":392,"375":-111,"376":-113,"377":392,"378":392,"387":-127,"388":-128,"389":-129,"395":-112,"396":-114,"397":-115,"398":392,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":392,"604":116,"607":116,"608":116,"611":116},"56":{"62":117,"63":117,"68":-278,"69":-279,"71":117,"204":117,"205":117,"221":117,"225":117,"231":117,"235":117,"340":117,"361":117,"362":117,"371":393,"373":393,"374":393,"375":-111,"376":-113,"377":393,"378":393,"387":-127,"388":-128,"389":-129,"395":-112,"396":-114,"397":-115,"398":393,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":393,"604":117,"607":117,"608":117,"611":117},"57":{"68":-278,"69":-279,"371":390,"373":390,"374":390,"375":-111,"376":-113,"377":390,"378":390,"387":-127,"388":-128,"389":-129,"395":-112,"396":-114,"397":-115,"398":390,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":390},"58":{"68":-278,"69":-279,"371":391,"373":391,"374":391,"375":-111,"376":-113,"377":391,"378":391,"387":-127,"388":-128,"389":-129,"395":-112,"396":-114,"397":-115,"398":391,"399":-116,"400":-117,"401":-118,"402":-119,"403":-120,"404":-121,"405":-122,"414":-123,"420":-124,"440":-125,"443":-126,"461":391},"59":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":95,"63":95,"68":-278,"69":-279,"71":95,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":95,"205":95,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"221":95,"222":-262,"225":95,"228":-263,"231":95,"235":95,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"333":335,"336":577,"340":95,"341":-151,"361":95,"362":95,"363":-210,"422":-91,"426":-92,"430":-93,"433":-94,"525":528,"527":538,"532":-176,"533":-177,"534":-178,"535":-186,"541":-182,"542":-183,"543":-184,"544":-185,"547":-180,"548":-179,"550":-187,"551":-181,"559":-174,"560":-175,"581":-152,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"604":95,"605":-207,"606":-208,"607":95,"608":95,"609":-209,"611":95,"614":-211},"60":{"0":36,"2":36,"3":-3,"62":110,"63":110,"65":-4,"66":-5,"68":-278,"69":-279,"71":110,"204":110,"205":110,"221":110,"225":110,"231":110,"235":110,"268":-6,"279":36,"281":36,"340":357,"361":110,"362":110,"604":110,"607":110,"608":110,"611":110},"61":{"0":37,"2":37,"3":-3,"62":97,"63":97,"65":-4,"66":-5,"68":-278,"69":-279,"71":97,"204":97,"205":97,"221":97,"225":97,"231":97,"235":97,"268":-6,"279":37,"281":37,"340":348,"361":97,"362":97,"562":563,"604":97,"607":97,"608":97,"611":97},"62":{"0":38,"2":38,"3":-3,"62":96,"63":96,"65":-4,"66":-5,"68":-278,"69":-279,"71":96,"204":96,"205":96,"221":96,"225":96,"231":96,"235":96,"268":-6,"279":38,"281":38,"340":347,"361":96,"362":96,"604":96,"607":96,"608":96,"611":96},"63":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":121,"63":121,"68":-278,"69":-279,"71":121,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":121,"205":121,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"221":121,"222":-262,"225":121,"228":-263,"231":121,"235":121,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"340":121,"361":121,"362":121,"363":-210,"422":-91,"426":-92,"430":-93,"433":-94,"465":504,"473":-164,"474":-165,"509":-166,"510":-167,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"604":121,"605":-207,"606":-208,"607":121,"608":121,"609":-209,"611":121,"614":-211},"64":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"363":-210,"422":-91,"426":-92,"430":-93,"433":-94,"463":-35,"466":507,"469":471,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"65":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"363":-210,"422":-91,"426":-92,"430":-93,"433":-94,"463":-35,"466":508,"469":472,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"605":-207,"606":-208,"609":-209,"614":-211},"66":{"0":39,"2":39,"3":-3,"62":107,"63":107,"65":-4,"66":-5,"68":-278,"69":-279,"71":107,"204":107,"205":107,"221":107,"225":107,"231":107,"235":107,"268":-6,"279":39,"281":39,"340":356,"361":107,"362":107,"604":107,"607":107,"608":107,"611":107},"67":{"62":102,"63":102,"68":-278,"69":-279,"71":102,"204":102,"205":102,"221":102,"225":102,"231":102,"235":102,"340":102,"361":102,"362":102,"525":530,"537":540,"604":102,"607":102,"608":102,"611":102},"68":{"0":40,"2":40,"3":-3,"62":99,"63":99,"65":-4,"66":-5,"68":-278,"69":-279,"71":99,"204":99,"205":99,"221":99,"225":99,"231":99,"235":99,"268":-6,"279":40,"281":40,"340":350,"361":99,"362":99,"604":99,"607":99,"608":99,"611":99},"69":{"62":100,"63":100,"68":-278,"69":-279,"71":100,"204":100,"205":100,"221":100,"225":100,"231":100,"235":100,"280":-7,"282":-8,"340":100,"361":100,"362":100,"513":514,"604":100,"607":100,"608":100,"611":100},"70":{"280":-7,"282":-8,"513":515,"516":518,"520":521},"71":{"0":43,"2":43,"3":-3,"8":43,"10":43,"11":43,"17":43,"27":43,"29":43,"32":43,"35":43,"37":43,"38":43,"39":43,"51":43,"54":43,"55":43,"56":43,"57":43,"58":43,"59":43,"60":43,"61":43,"62":217,"63":217,"65":-4,"66":-5,"67":43,"68":-278,"69":-279,"71":108,"72":43,"73":43,"74":43,"75":43,"76":43,"78":43,"79":43,"80":43,"81":43,"82":43,"83":43,"84":43,"85":43,"90":43,"98":43,"119":43,"123":43,"125":43,"127":43,"130":43,"132":43,"134":43,"136":43,"138":43,"140":43,"142":43,"144":43,"146":43,"149":43,"151":43,"153":43,"155":43,"157":43,"159":43,"161":43,"163":43,"165":43,"167":43,"168":43,"174":43,"176":43,"178":43,"180":43,"182":43,"184":43,"186":43,"188":43,"190":43,"192":43,"194":43,"196":43,"199":43,"201":43,"203":43,"204":217,"205":217,"221":217,"225":217,"231":217,"235":217,"268":-6,"269":43,"273":43,"275":43,"279":43,"281":43,"285":43,"288":43,"335":43,"340":108,"346":43,"347":43,"348":43,"349":43,"354":43,"356":43,"359":43,"360":43,"361":217,"362":217,"408":43,"412":43,"457":43,"459":43,"467":43,"471":43,"472":43,"477":43,"482":43,"486":43,"492":43,"494":43,"500":43,"504":43,"507":43,"508":43,"525":43,"530":43,"537":43,"540":43,"549":43,"563":43,"577":43,"589":43,"604":217,"607":217,"608":217,"611":217},"72":{"0":62,"2":62,"3":-3,"8":62,"10":62,"11":62,"17":62,"27":62,"29":62,"32":62,"35":62,"37":62,"38":62,"39":62,"51":62,"54":62,"55":62,"56":62,"57":62,"58":62,"59":62,"60":62,"61":62,"65":-4,"66":-5,"67":62,"68":-278,"69":-279,"71":62,"72":62,"73":62,"74":62,"75":62,"76":62,"78":62,"79":62,"80":62,"81":62,"82":62,"83":62,"84":62,"85":62,"90":62,"98":62,"119":62,"123":62,"125":62,"127":62,"130":62,"132":62,"134":62,"136":62,"138":62,"140":62,"142":62,"144":62,"146":62,"149":62,"151":62,"153":62,"155":62,"157":62,"159":62,"161":62,"163":62,"165":62,"167":62,"168":62,"174":62,"176":62,"178":62,"180":62,"182":62,"184":62,"186":62,"188":62,"190":62,"192":62,"194":62,"196":62,"199":62,"201":62,"203":62,"268":-6,"269":62,"273":62,"275":62,"279":62,"281":62,"285":62,"288":62,"300":62,"316":62,"321":62,"330":62,"335":62,"340":62,"346":62,"347":62,"348":62,"349":62,"354":62,"356":62,"359":62,"360":62,"408":62,"412":62,"424":62,"457":62,"459":62,"467":62,"471":62,"472":62,"477":62,"482":62,"486":62,"492":62,"494":62,"500":62,"504":62,"507":62,"508":62,"525":62,"530":62,"537":62,"540":62,"549":62,"563":62,"577":62,"589":62},"73":{"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":601,"68":-278,"69":-279,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"228":-263,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"280":-7,"282":-8,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"343":-212,"363":-210,"364":-213,"365":-214,"366":-215,"367":-216,"368":-217,"422":-91,"426":-92,"430":-93,"433":-94,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"602":605,"603":606,"605":-207,"606":-208,"607":609,"609":-209,"613":614,"614":-211},"74":{"0":46,"2":46,"3":-3,"8":46,"10":46,"11":46,"17":46,"27":46,"29":46,"32":46,"35":46,"37":46,"38":46,"39":46,"51":46,"54":46,"55":46,"56":46,"57":46,"58":46,"59":46,"60":46,"61":46,"62":213,"63":213,"65":-4,"66":-5,"67":46,"68":-278,"69":-279,"71":92,"72":46,"73":46,"74":46,"75":46,"76":46,"78":46,"79":46,"80":46,"81":46,"82":46,"83":46,"84":46,"85":46,"90":46,"98":46,"119":46,"123":46,"125":46,"127":46,"130":46,"132":46,"134":46,"136":46,"138":46,"140":46,"142":46,"144":46,"146":46,"149":46,"151":46,"153":46,"155":46,"157":46,"159":46,"161":46,"163":46,"165":46,"167":46,"168":46,"174":46,"176":46,"178":46,"180":46,"182":46,"184":46,"186":46,"188":46,"190":46,"192":46,"194":46,"196":46,"199":46,"201":46,"203":46,"204":213,"205":213,"221":213,"225":213,"231":213,"235":213,"268":-6,"269":46,"273":46,"275":46,"279":46,"281":46,"285":46,"288":46,"300":46,"308":46,"309":46,"316":46,"321":46,"330":46,"335":46,"340":92,"346":46,"347":46,"348":46,"349":46,"354":46,"356":46,"359":46,"360":46,"361":213,"362":213,"408":46,"412":46,"424":46,"449":46,"451":46,"457":46,"459":46,"467":46,"471":46,"472":46,"477":46,"482":46,"486":46,"492":46,"494":46,"500":46,"504":46,"507":46,"508":46,"525":46,"530":46,"537":46,"540":46,"549":46,"563":46,"577":46,"589":46,"604":213,"607":213,"608":213,"611":213},"75":{"62":111,"63":111,"68":-278,"69":-279,"71":111,"204":111,"205":111,"221":111,"225":111,"231":111,"235":111,"340":111,"361":111,"362":111,"604":111,"607":111,"608":111,"611":111},"76":{"0":64,"2":64,"3":-3,"8":64,"10":64,"11":64,"17":64,"27":64,"29":64,"32":64,"35":64,"37":64,"38":64,"39":64,"51":64,"54":64,"55":64,"56":64,"57":64,"58":64,"59":64,"60":64,"61":64,"62":219,"63":219,"65":-4,"66":-5,"67":64,"68":-278,"69":-279,"71":122,"72":64,"73":64,"74":64,"75":64,"76":64,"78":64,"79":64,"80":64,"81":64,"82":64,"83":64,"84":64,"85":64,"90":64,"98":64,"119":64,"123":64,"125":64,"127":64,"130":64,"132":64,"134":64,"136":64,"138":64,"140":64,"142":64,"144":64,"146":64,"149":64,"151":64,"153":64,"155":64,"157":64,"159":64,"161":64,"163":64,"165":64,"167":64,"168":64,"174":64,"176":64,"178":64,"180":64,"182":64,"184":64,"186":64,"188":64,"190":64,"192":64,"194":64,"196":64,"199":64,"201":64,"203":64,"204":219,"205":219,"221":219,"225":219,"231":219,"235":219,"268":-6,"269":64,"273":64,"275":64,"279":64,"281":64,"285":64,"288":64,"300":64,"316":64,"321":64,"330":64,"335":64,"340":122,"346":64,"347":64,"348":64,"349":64,"354":64,"356":64,"359":64,"360":64,"361":219,"362":219,"408":64,"412":64,"424":64,"457":64,"459":64,"467":64,"471":64,"472":64,"477":64,"482":64,"486":64,"492":64,"494":64,"500":64,"504":64,"507":64,"508":64,"525":64,"530":64,"537":64,"540":64,"549":64,"563":64,"577":64,"589":64,"604":219,"607":219,"608":219,"611":219},"77":{"4":68,"5":68,"6":-9,"7":-10,"8":-11,"9":-13,"12":-18,"13":-21,"14":-22,"15":-23,"16":-24,"18":-31,"19":-32,"20":-33,"21":-34,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":68,"70":-19,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"224":68,"225":68,"226":68,"227":68,"228":-263,"229":68,"230":68,"231":68,"232":68,"236":-273,"238":-272,"239":-274,"241":-275,"242":-276,"243":-277,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"270":-20,"271":-12,"272":-14,"274":-15,"276":-16,"278":-17,"280":-7,"282":-8,"283":-25,"284":-35,"286":-28,"287":-26,"290":-29,"291":-27,"292":-30,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"333":-144,"334":-145,"336":-150,"337":-146,"338":-147,"341":-151,"342":68,"343":-212,"344":-35,"351":-36,"352":-10,"353":-9,"354":-11,"355":-13,"363":-210,"364":-213,"365":-214,"366":-215,"367":-216,"368":-217,"369":-107,"372":-108,"379":68,"380":68,"381":68,"382":68,"383":68,"384":68,"385":-140,"394":-110,"407":-142,"409":-143,"410":68,"419":68,"422":-91,"426":-92,"430":-93,"433":-94,"434":-141,"438":68,"442":68,"445":-132,"446":-133,"448":-135,"450":-136,"452":-134,"453":-137,"458":-139,"460":-138,"462":-109,"470":-155,"480":-156,"484":-157,"488":-160,"496":-158,"498":-161,"502":-159,"503":-162,"506":-163,"512":-154,"516":-188,"519":-191,"520":-189,"522":-192,"523":-190,"527":68,"532":-176,"533":-177,"534":-178,"535":-186,"536":-168,"541":-182,"542":-183,"543":-184,"544":-185,"545":68,"547":-180,"548":-179,"550":-187,"551":-181,"552":68,"554":68,"556":68,"559":-174,"560":-175,"561":68,"564":-153,"565":-74,"566":-75,"572":-76,"573":-77,"578":-148,"579":-149,"581":-152,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"603":68,"605":-207,"606":-208,"609":-209,"610":68,"612":68,"614":-211},"78":{"4":69,"5":69,"6":-9,"7":-10,"8":-11,"9":-13,"12":-18,"13":-21,"14":-22,"15":-23,"16":-24,"18":-31,"19":-32,"20":-33,"21":-34,"22":-35,"23":-36,"24":-37,"25":-38,"26":-39,"28":-41,"30":-43,"31":-44,"33":-55,"34":-56,"43":-193,"44":-280,"45":-281,"46":-282,"47":-283,"48":-284,"49":-285,"50":-286,"62":69,"70":-19,"71":-45,"77":-57,"86":-46,"87":-48,"88":-35,"89":-36,"91":-283,"92":-282,"108":-193,"124":-47,"126":-219,"128":-232,"129":-40,"131":-226,"133":-218,"135":-220,"137":-221,"139":-222,"141":-223,"143":-224,"145":-225,"147":-62,"148":-227,"150":-228,"152":-229,"154":-230,"156":-231,"158":-233,"160":-234,"162":-235,"164":-236,"166":-237,"169":-238,"170":-194,"173":-195,"177":-239,"179":-240,"181":-241,"183":-242,"185":-243,"187":-244,"189":-245,"191":-246,"193":-247,"195":-248,"197":-65,"198":-249,"200":-250,"202":-251,"204":-253,"205":-257,"206":-252,"207":-254,"208":-255,"209":-261,"220":-256,"222":-262,"224":69,"225":69,"226":69,"227":69,"228":-263,"229":69,"230":69,"231":69,"232":69,"236":-273,"238":-272,"239":-274,"241":-275,"242":-276,"243":-277,"249":-258,"250":-259,"251":-260,"252":-51,"254":-52,"255":-53,"256":-54,"257":-82,"259":-83,"260":-66,"261":-67,"262":-68,"263":-69,"264":-70,"265":-71,"266":-72,"267":-73,"270":-20,"271":-12,"272":-14,"274":-15,"276":-16,"278":-17,"280":-7,"282":-8,"283":-25,"284":-35,"286":-28,"287":-26,"290":-29,"291":-27,"292":-30,"293":-42,"298":-49,"299":-50,"303":-88,"314":-89,"324":-87,"328":-90,"333":-144,"334":-145,"336":-150,"337":-146,"338":-147,"341":-151,"342":69,"343":-212,"344":-35,"351":-36,"352":-10,"353":-9,"354":-11,"355":-13,"363":-210,"364":-213,"365":-214,"366":-215,"367":-216,"368":-217,"369":-107,"372":-108,"379":69,"380":69,"381":69,"382":69,"383":69,"384":69,"385":-140,"394":-110,"407":-142,"409":-143,"410":69,"419":69,"422":-91,"426":-92,"430":-93,"433":-94,"434":-141,"438":69,"442":69,"445":-132,"446":-133,"448":-135,"450":-136,"452":-134,"453":-137,"458":-139,"460":-138,"462":-109,"470":-155,"480":-156,"484":-157,"488":-160,"496":-158,"498":-161,"502":-159,"503":-162,"506":-163,"512":-154,"516":-188,"519":-191,"520":-189,"522":-192,"523":-190,"527":69,"532":-176,"533":-177,"534":-178,"535":-186,"536":-168,"541":-182,"542":-183,"543":-184,"544":-185,"545":69,"547":-180,"548":-179,"550":-187,"551":-181,"552":69,"554":69,"556":69,"559":-174,"560":-175,"561":69,"564":-153,"565":-74,"566":-75,"572":-76,"573":-77,"578":-148,"579":-149,"581":-152,"582":-196,"588":-197,"594":-86,"595":-58,"596":-59,"597":-60,"598":-61,"599":-63,"600":-64,"601":-206,"603":69,"605":-207,"606":-208,"609":-209,"610":69,"612":69,"614":-211},"79":{"0":44,"2":44,"3":-3,"8":44,"10":44,"11":44,"17":44,"27":44,"29":44,"32":44,"35":44,"37":44,"38":44,"39":44,"51":44,"54":44,"55":44,"56":44,"57":44,"58":44,"59":44,"60":44,"61":44,"65":-4,"66":-5,"67":44,"68":-278,"69":-279,"71":44,"72":44,"73":44,"74":44,"75":44,"76":44,"78":44,"79":44,"80":44,"81":44,"82":44,"83":44,"84":44,"85":44,"90":44,"98":44,"119":44,"123":44,"125":44,"127":44,"130":44,"132":44,"134":44,"136":44,"138":44,"140":44,"142":44,"144":44,"146":44,"149":44,"151":44,"153":44,"155":44,"157":44,"159":44,"161":44,"163":44,"165":44,"167":44,"168":44,"174":44,"176":44,"178":44,"180":44,"182":44,"184":44,"186":44,"188":44,"190":44,"192":44,"194":44,"196":44,"199":44,"201":44,"203":44,"268":-6,"269":44,"273":44,"275":44,"279":44,"281":44,"285":44,"288":44,"300":44,"308":44,"309":44,"316":44,"321":44,"330":44,"335":44,"340":44,"346":44,"347":44,"348":44,"349":44,"354":44,"356":44,"359":44,"360":44,"408":44,"412":44,"424":44,"449":44,"451":44,"457":44,"459":44,"467":44,"471":44,"472":44,"477":44,"482":44,"486":44,"492":44,"494":44,"500":44,"504":44,"507":44,"508":44,"525":44,"530":44,"537":44,"540":44,"549":44,"563":44,"577":44,"589":44},"80":{"0":45,"2":45,"3":-3,"8":45,"10":45,"11":45,"17":45,"27":45,"29":45,"32":45,"35":45,"37":45,"38":45,"39":45,"51":45,"54":45,"55":45,"56":45,"57":45,"58":45,"59":45,"60":45,"61":45,"65":-4,"66":-5,"67":45,"68":-278,"69":-279,"71":45,"72":45,"73":45,"74":45,"75":45,"76":45,"78":45,"79":45,"80":45,"81":45,"82":45,"83":45,"84":45,"85":45,"90":45,"98":45,"119":45,"123":45,"125":45,"127":45,"130":45,"132":45,"134":45,"136":45,"138":45,"140":45,"142":45,"144":45,"146":45,"149":45,"151":45,"153":45,"155":45,"157":45,"159":45,"161":45,"163":45,"165":45,"167":45,"168":45,"174":45,"176":45,"178":45,"180":45,"182":45,"184":45,"186":45,"188":45,"190":45,"192":45,"194":45,"196":45,"199":45,"201":45,"203":45,"268":-6,"269":45,"273":45,"275":45,"279":45,"281":45,"285":45,"288":45,"300":45,"308":45,"309":45,"316":45,"321":45,"330":45,"335":45,"340":45,"346":45,"347":45,"348":45,"349":45,"354":45,"356":45,"359":45,"360":45,"408":45,"412":45,"424":45,"449":45,"451":45,"457":45,"459":45,"467":45,"471":45,"472":45,"477":45,"482":45,"486":45,"492":45,"494":45,"500":45,"504":45,"507":45,"508":45,"525":45,"530":45,"537":45,"540":45,"549":45,"563":45,"577":45,"589":45},"81":{"0":48,"2":48,"3":-3,"8":48,"10":48,"11":48,"17":48,"27":48,"29":48,"32":48,"35":48,"37":48,"38":48,"39":48,"51":48,"54":48,"55":48,"56":48,"57":48,"58":48,"59":48,"60":48,"61":48,"65":-4,"66":-5,"67":48,"68":-278,"69":-279,"71":48,"72":48,"73":48,"74":48,"75":48,"76":48,"78":48,"79":48,"80":48,"81":48,"82":48,"83":48,"84":48,"85":48,"90":48,"98":48,"119":48,"123":48,"125":48,"127":48,"130":48,"132":48,"134":48,"136":48,"138":48,"140":48,"142":48,"144":48,"146":48,"149":48,"151":48,"153":48,"155":48,"157":48,"159":48,"161":48,"163":48,"165":48,"167":48,"168":48,"174":48,"176":48,"178":48,"180":48,"182":48,"184":48,"186":48,"188":48,"190":48,"192":48,"194":48,"196":48,"199":48,"201":48,"203":48,"268":-6,"269":48,"273":48,"275":48,"279":48,"281":48,"285":48,"288":48,"300":48,"308":48,"309":48,"316":48,"321":48,"330":48,"335":48,"340":48,"346":48,"347":48,"348":48,"349":48,"354":48,"356":48,"359":48,"360":48,"408":48,"412":48,"424":48,"449":48,"451":48,"457":48,"459":48,"467":48,"471":48,"472":48,"477":48,"482":48,"486":48,"492":48,"494":48,"500":48,"504":48,"507":48,"508":48,"525":48,"530":48,"537":48,"540":48,"549":48,"563":48,"577":48,"589":48},"82":{"0":49,"2":49,"3":-3,"8":49,"10":49,"11":49,"17":49,"27":49,"29":49,"32":49,"35":49,"37":49,"38":49,"39":49,"51":49,"54":49,"55":49,"56":49,"57":49,"58":49,"59":49,"60":49,"61":49,"65":-4,"66":-5,"67":49,"68":-278,"69":-279,"71":49,"72":49,"73":49,"74":49,"75":49,"76":49,"78":49,"79":49,"80":49,"81":49,"82":49,"83":49,"84":49,"85":49,"90":49,"98":49,"119":49,"123":49,"125":49,"127":49,"130":49,"132":49,"134":49,"136":49,"138":49,"140":49,"142":49,"144":49,"146":49,"149":49,"151":49,"153":49,"155":49,"157":49,"159":49,"161":49,"163":49,"165":49,"167":49,"168":49,"174":49,"176":49,"178":49,"180":49,"182":49,"184":49,"186":49,"188":49,"190":49,"192":49,"194":49,"196":49,"199":49,"201":49,"203":49,"268":-6,"269":49,"273":49,"275":49,"279":49,"281":49,"285":49,"288":49,"300":49,"308":49,"309":49,"316":49,"321":49,"330":49,"335":49,"340":49,"346":49,"347":49,"348":49,"349":49,"354":49,"356":49,"359":49,"360":49,"408":49,"412":49,"424":49,"449":49,"451":49,"457":49,"459":49,"467":49,"471":49,"472":49,"477":49,"482":49,"486":49,"492":49,"494":49,"500":49,"504":49,"507":49,"508":49,"525":49,"530":49,"537":49,"540":49,"549":49,"563":49,"577":49,"589":49},"83":{"0":50,"2":50,"3":-3,"8":50,"10":50,"11":50,"17":50,"27":50,"29":50,"32":50,"35":50,"37":50,"38":50,"39":50,"51":50,"54":50,"55":50,"56":50,"57":50,"58":50,"59":50,"60":50,"61":50,"65":-4,"66":-5,"67":50,"68":-278,"69":-279,"71":50,"72":50,"73":50,"74":50,"75":50,"76":50,"78":50,"79":50,"80":50,"81":50,"82":50,"83":50,"84":50,"85":50,"90":50,"98":50,"119":50,"123":50,"125":50,"127":50,"130":50,"132":50,"134":50,"136":50,"138":50,"140":50,"142":50,"144":50,"146":50,"149":50,"151":50,"153":50,"155":50,"157":50,"159":50,"161":50,"163":50,"165":50,"167":50,"168":50,"174":50,"176":50,"178":50,"180":50,"182":50,"184":50,"186":50,"188":50,"190":50,"192":50,"194":50,"196":50,"199":50,"201":50,"203":50,"268":-6,"269":50,"273":50,"275":50,"279":50,"281":50,"285":50,"288":50,"300":50,"308":50,"309":50,"316":50,"321":50,"330":50,"335":50,"340":50,"346":50,"347":50,"348":50,"349":50,"354":50,"356":50,"359":50,"360":50,"408":50,"412":50,"424":50,"449":50,"451":50,"457":50,"459":50,"467":50,"471":50,"472":50,"477":50,"482":50,"486":50,"492":50,"494":50,"500":50,"504":50,"507":50,"508":50,"525":50,"530":50,"537":50,"540":50,"549":50,"563":50,"577":50,"589":50}};
var tableNonTerm = {"-2":{"0":1},"-3":{"0":2,"279":281,"340":281},"-4":{"0":3,"2":65,"279":3,"281":65,"340":3},"-6":{"0":4,"2":4,"279":4,"281":4,"340":4},"-7":{"0":5,"2":5,"8":271,"10":272,"11":277,"17":286,"27":129,"29":293,"32":294,"35":332,"37":511,"38":466,"39":524,"51":584,"54":595,"55":596,"56":597,"57":598,"58":147,"59":599,"60":600,"61":197,"67":70,"71":86,"72":252,"73":253,"74":255,"75":256,"76":172,"78":260,"79":261,"80":262,"81":263,"82":264,"83":265,"84":266,"85":267,"90":129,"98":147,"119":197,"123":124,"125":126,"127":128,"130":131,"132":133,"134":135,"136":137,"138":139,"140":141,"142":143,"144":145,"146":148,"149":150,"151":152,"153":154,"155":156,"157":158,"159":160,"161":162,"163":164,"165":166,"167":169,"168":172,"174":175,"176":177,"178":179,"180":181,"182":183,"184":185,"186":187,"188":189,"190":191,"192":193,"194":195,"196":198,"199":200,"201":202,"203":206,"269":270,"273":274,"275":276,"279":5,"281":5,"285":292,"288":289,"335":339,"340":5,"346":332,"347":466,"348":511,"349":129,"354":271,"356":524,"359":286,"360":277,"408":409,"412":434,"457":458,"459":460,"467":469,"471":473,"472":474,"477":479,"482":483,"486":487,"492":497,"494":495,"500":501,"504":505,"507":509,"508":510,"525":535,"530":535,"537":535,"540":535,"549":550,"563":564,"577":580,"589":590},"-27":{"0":12,"2":12,"279":12,"281":12,"335":338,"340":12,"577":579},"-30":{"0":13,"2":13,"279":13,"281":13,"340":13},"-32":{"0":14,"2":14,"279":14,"281":14,"340":14},"-36":{"0":15,"2":15,"279":15,"281":15,"340":15},"-16":{"0":16,"2":16,"17":283,"279":16,"281":16,"284":287,"285":291,"340":16,"359":283},"-9":{"0":18,"2":18,"279":18,"281":18,"340":18},"-37":{"0":24,"2":24,"8":24,"10":24,"11":24,"17":24,"27":24,"29":24,"32":24,"35":24,"37":24,"38":24,"39":24,"51":24,"54":24,"55":24,"56":24,"57":24,"58":24,"59":24,"60":24,"61":24,"67":24,"71":24,"72":24,"73":24,"74":24,"75":24,"76":24,"78":24,"79":24,"80":24,"81":24,"82":24,"83":24,"84":24,"85":24,"90":24,"98":24,"119":24,"123":24,"125":24,"127":24,"130":24,"132":24,"134":24,"136":24,"138":24,"140":24,"142":24,"144":24,"146":24,"149":24,"151":24,"153":24,"155":24,"157":24,"159":24,"161":24,"163":24,"165":24,"167":24,"168":24,"174":24,"176":24,"178":24,"180":24,"182":24,"184":24,"186":24,"188":24,"190":24,"192":24,"194":24,"196":24,"199":24,"201":24,"203":24,"269":24,"273":24,"275":24,"279":24,"281":24,"285":24,"288":24,"335":24,"340":24,"346":24,"347":24,"348":24,"349":24,"354":24,"356":24,"359":24,"360":24,"408":24,"412":24,"457":24,"459":24,"467":24,"471":24,"472":24,"477":24,"482":24,"486":24,"492":24,"494":24,"500":24,"504":24,"507":24,"508":24,"525":24,"530":24,"537":24,"540":24,"549":24,"563":24,"577":24,"589":24},"-49":{"0":25,"2":25,"8":25,"10":25,"11":25,"17":25,"27":25,"29":25,"32":25,"35":25,"37":25,"38":25,"39":25,"51":25,"54":25,"55":25,"56":25,"57":25,"58":25,"59":25,"60":25,"61":25,"67":25,"71":25,"72":25,"73":25,"74":25,"75":25,"76":25,"78":25,"79":25,"80":25,"81":25,"82":25,"83":25,"84":25,"85":25,"90":25,"98":25,"119":25,"123":25,"125":25,"127":25,"130":25,"132":25,"134":25,"136":25,"138":25,"140":25,"142":25,"144":25,"146":25,"149":25,"151":25,"153":25,"155":25,"157":25,"159":25,"161":25,"163":25,"165":25,"167":25,"168":25,"174":25,"176":25,"178":25,"180":25,"182":25,"184":25,"186":25,"188":25,"190":25,"192":25,"194":25,"196":25,"199":25,"201":25,"203":25,"269":25,"273":25,"275":25,"279":25,"281":25,"285":25,"288":25,"300":307,"308":318,"309":319,"316":307,"321":307,"330":307,"335":25,"340":25,"346":25,"347":25,"348":25,"349":25,"354":25,"356":25,"359":25,"360":25,"408":25,"412":25,"424":307,"449":450,"451":452,"457":25,"459":25,"467":25,"471":25,"472":25,"477":25,"482":25,"486":25,"492":25,"494":25,"500":25,"504":25,"507":25,"508":25,"525":25,"530":25,"537":25,"540":25,"549":25,"563":25,"577":25,"589":25},"-38":{"0":26,"2":26,"8":26,"10":26,"11":26,"17":26,"27":26,"29":26,"32":26,"35":26,"37":26,"38":26,"39":26,"51":26,"54":26,"55":26,"56":26,"57":26,"58":26,"59":26,"60":26,"61":26,"67":26,"71":26,"72":26,"73":26,"74":26,"75":26,"76":26,"78":26,"79":26,"80":26,"81":26,"82":26,"83":26,"84":26,"85":26,"90":26,"98":26,"119":26,"123":26,"125":26,"127":26,"130":26,"132":26,"134":26,"136":26,"138":26,"140":26,"142":26,"144":26,"146":26,"149":26,"151":26,"153":26,"155":26,"157":26,"159":26,"161":26,"163":26,"165":26,"167":26,"168":26,"174":26,"176":26,"178":26,"180":26,"182":26,"184":26,"186":26,"188":26,"190":26,"192":26,"194":26,"196":26,"199":26,"201":26,"203":26,"269":26,"273":26,"275":26,"279":26,"281":26,"285":26,"288":26,"300":310,"316":310,"321":310,"330":310,"335":26,"340":26,"346":26,"347":26,"348":26,"349":26,"354":26,"356":26,"359":26,"360":26,"408":26,"412":26,"424":310,"457":26,"459":26,"467":26,"471":26,"472":26,"477":26,"482":26,"486":26,"492":26,"494":26,"500":26,"504":26,"507":26,"508":26,"525":26,"530":26,"537":26,"540":26,"549":26,"563":26,"577":26,"589":26},"-11":{"0":28,"2":28,"8":28,"10":28,"11":28,"17":28,"27":28,"29":28,"32":28,"35":28,"37":28,"38":28,"39":28,"51":28,"54":28,"55":28,"56":28,"57":28,"58":28,"59":28,"60":28,"61":28,"67":28,"71":28,"72":28,"73":28,"74":28,"75":28,"76":28,"78":28,"79":28,"80":28,"81":28,"82":28,"83":28,"84":28,"85":28,"90":28,"98":28,"119":28,"123":28,"125":28,"127":28,"130":28,"132":28,"134":28,"136":28,"138":28,"140":28,"142":28,"144":28,"146":28,"149":28,"151":28,"153":28,"155":28,"157":28,"159":28,"161":28,"163":28,"165":28,"167":28,"168":28,"174":28,"176":28,"178":28,"180":28,"182":28,"184":28,"186":28,"188":28,"190":28,"192":28,"194":28,"196":28,"199":28,"201":28,"203":28,"269":28,"273":28,"275":28,"279":28,"281":28,"285":28,"288":28,"335":28,"340":28,"346":28,"347":28,"348":28,"349":28,"354":28,"356":28,"359":28,"360":28,"408":28,"412":28,"457":28,"459":28,"467":28,"471":28,"472":28,"477":28,"482":28,"486":28,"492":28,"494":28,"500":28,"504":28,"507":28,"508":28,"525":28,"530":28,"537":28,"540":28,"549":28,"563":28,"577":28,"589":28},"-13":{"0":30,"2":30,"8":30,"10":30,"11":30,"17":30,"27":30,"29":30,"32":30,"35":30,"37":30,"38":30,"39":30,"51":30,"54":30,"55":30,"56":30,"57":30,"58":30,"59":30,"60":30,"61":30,"67":30,"71":30,"72":30,"73":30,"74":30,"75":30,"76":30,"78":30,"79":30,"80":30,"81":30,"82":30,"83":30,"84":30,"85":30,"90":30,"98":30,"119":30,"123":30,"125":30,"127":30,"130":30,"132":30,"134":30,"136":30,"138":30,"140":30,"142":30,"144":30,"146":30,"149":30,"151":30,"153":30,"155":30,"157":30,"159":30,"161":30,"163":30,"165":30,"167":30,"168":30,"174":30,"176":30,"178":30,"180":30,"182":30,"184":30,"186":30,"188":30,"190":30,"192":30,"194":30,"196":30,"199":30,"201":30,"203":30,"269":30,"273":30,"275":30,"279":30,"281":30,"285":30,"288":30,"335":30,"340":30,"346":30,"347":30,"348":30,"349":30,"354":30,"356":30,"359":30,"360":30,"385":410,"408":30,"411":415,"412":30,"437":438,"439":441,"457":30,"459":30,"467":30,"471":30,"472":30,"477":30,"482":30,"486":30,"492":30,"494":30,"500":30,"504":30,"507":30,"508":30,"525":30,"530":30,"537":30,"540":30,"549":30,"563":30,"577":30,"589":30},"-8":{"0":31,"2":31,"8":31,"10":31,"11":31,"17":31,"27":31,"29":31,"32":31,"35":31,"37":31,"38":31,"39":31,"51":31,"54":31,"55":31,"56":31,"57":31,"58":31,"59":31,"60":31,"61":31,"67":31,"71":31,"72":31,"73":31,"74":31,"75":31,"76":31,"78":31,"79":31,"80":31,"81":31,"82":31,"83":31,"84":31,"85":31,"90":31,"98":31,"119":31,"123":31,"125":31,"127":31,"130":31,"132":31,"134":31,"136":31,"138":31,"140":31,"142":31,"144":31,"146":31,"149":31,"151":31,"153":31,"155":31,"157":31,"159":31,"161":31,"163":31,"165":31,"167":31,"168":31,"174":31,"176":31,"178":31,"180":31,"182":31,"184":31,"186":31,"188":31,"190":31,"192":31,"194":31,"196":31,"199":31,"201":31,"203":31,"269":31,"273":31,"275":31,"279":31,"281":31,"285":31,"288":31,"335":31,"340":31,"346":31,"347":31,"348":31,"349":31,"354":31,"356":31,"359":31,"360":31,"408":31,"412":31,"457":31,"459":31,"467":31,"471":31,"472":31,"477":31,"482":31,"486":31,"492":31,"494":31,"500":31,"504":31,"507":31,"508":31,"525":31,"530":31,"537":31,"540":31,"549":31,"563":31,"577":31,"589":31},"-40":{"0":33,"2":33,"8":33,"10":33,"11":33,"17":33,"27":33,"29":33,"32":33,"35":33,"37":33,"38":33,"39":33,"51":33,"54":33,"55":33,"56":33,"57":33,"58":33,"59":33,"60":33,"61":33,"67":33,"71":33,"72":33,"73":33,"74":33,"75":33,"76":33,"78":33,"79":33,"80":33,"81":33,"82":33,"83":33,"84":33,"85":33,"90":33,"98":33,"119":33,"123":33,"125":33,"127":33,"130":33,"132":33,"134":33,"136":33,"138":33,"140":33,"142":33,"144":33,"146":33,"149":33,"151":33,"153":33,"155":33,"157":33,"159":33,"161":33,"163":33,"165":33,"167":33,"168":33,"174":33,"176":33,"178":33,"180":33,"182":33,"184":33,"186":33,"188":33,"190":33,"192":33,"194":33,"196":33,"199":33,"201":33,"203":33,"269":33,"273":33,"275":33,"279":33,"281":33,"285":33,"288":33,"300":305,"316":305,"321":305,"330":305,"335":33,"340":33,"346":33,"347":33,"348":33,"349":33,"354":33,"356":33,"359":33,"360":33,"408":33,"412":33,"424":305,"457":33,"459":33,"467":33,"471":33,"472":33,"477":33,"482":33,"486":33,"492":33,"494":33,"500":33,"504":33,"507":33,"508":33,"525":33,"530":33,"537":33,"540":33,"549":33,"563":33,"577":33,"589":33},"-43":{"0":34,"2":34,"8":34,"10":34,"11":34,"17":34,"27":34,"29":34,"32":34,"35":34,"37":34,"38":34,"39":34,"51":34,"54":34,"55":34,"56":34,"57":34,"58":34,"59":34,"60":34,"61":34,"67":34,"71":34,"72":34,"73":34,"74":34,"75":34,"76":34,"78":34,"79":34,"80":34,"81":34,"82":34,"83":34,"84":34,"85":34,"90":34,"98":34,"119":34,"123":34,"125":34,"127":34,"130":34,"132":34,"134":34,"136":34,"138":34,"140":34,"142":34,"144":34,"146":34,"149":34,"151":34,"153":34,"155":34,"157":34,"159":34,"161":34,"163":34,"165":34,"167":34,"168":34,"174":34,"176":34,"178":34,"180":34,"182":34,"184":34,"186":34,"188":34,"190":34,"192":34,"194":34,"196":34,"199":34,"201":34,"203":34,"269":34,"273":34,"275":34,"279":34,"281":34,"285":34,"288":34,"300":306,"316":306,"321":306,"330":306,"335":34,"340":34,"346":34,"347":34,"348":34,"349":34,"354":34,"356":34,"359":34,"360":34,"408":34,"412":34,"424":306,"457":34,"459":34,"467":34,"471":34,"472":34,"477":34,"482":34,"486":34,"492":34,"494":34,"500":34,"504":34,"507":34,"508":34,"525":34,"530":34,"537":34,"540":34,"549":34,"563":34,"577":34,"589":34},"-48":{"4":66,"5":268,"62":602,"224":245,"225":246,"226":247,"227":248,"229":233,"230":234,"231":240,"232":244,"342":361,"379":400,"380":401,"381":402,"382":403,"383":404,"384":405,"410":414,"419":420,"438":440,"442":443,"527":537,"545":546,"552":553,"554":555,"556":557,"561":562,"603":608,"610":611,"612":613},"-14":{"32":297,"53":418,"411":418,"413":297,"439":418},"-5":{"36":561,"40":513,"52":594,"277":278,"302":303,"313":314,"323":324,"327":328,"332":333,"335":337,"339":341,"350":513,"357":561,"421":422,"425":426,"429":430,"432":433,"465":503,"469":470,"479":480,"483":484,"487":488,"495":496,"497":498,"501":502,"505":506,"511":512,"514":516,"515":523,"517":520,"518":519,"521":522,"528":554,"529":556,"531":560,"538":552,"539":545,"541":551,"547":548,"558":559,"577":578,"580":581},"-31":{"38":465,"347":465},"-10":{"42":567,"358":567},"-39":{"51":583},"-41":{"62":603,"63":342,"340":342,"604":610},"-42":{"62":343,"63":343,"71":87,"204":209,"205":209,"221":222,"225":209,"231":209,"235":209,"340":343,"361":364,"362":365,"604":343,"607":365,"608":364,"611":364},"-12":{"76":258,"168":171},"-44":{"204":207,"205":249,"225":241,"231":241,"235":237},"-45":{"204":208,"205":250,"207":220,"224":236,"225":242,"230":236,"231":242,"238":239,"241":243,"249":251},"-46":{"210":223},"-47":{"210":227,"223":229},"-15":{"300":304,"316":317,"321":322,"330":331,"424":427},"-28":{"333":334},"-29":{"333":336},"-17":{"371":461,"373":374},"-18":{"371":375,"373":375,"374":395,"461":395},"-19":{"371":376,"373":376,"374":376,"377":396,"378":397,"398":399,"461":376},"-20":{"371":378,"373":378,"374":378,"461":378},"-22":{"371":382,"373":382,"374":382,"377":382,"378":382,"398":382,"461":382},"-24":{"371":383,"373":383,"374":383,"377":383,"378":383,"398":383,"461":383},"-26":{"371":384,"373":384,"374":384,"377":384,"378":384,"398":384,"461":384},"-21":{"371":386,"373":386,"374":386,"377":386,"378":386,"398":386,"461":386},"-25":{"391":453},"-23":{"444":445},"-33":{"525":526},"-34":{"525":527},"-35":{"525":531,"530":558,"537":541,"540":547}};
var terms = {"EOF":0,"_START_":-1,"Start":-2,"Body":-3,"Line":-4,"Block":-5,"Statement":-6,"Exp":-7,"Operation":-8,"Import":-9,"ImportVars":-10,"Call":-11,"CallElements":-12,"Function":-13,"FuncArgs":-14,"FuncDefValue":-15,"Class":-16,"ClassBody":-17,"ClassProperties":-18,"ClassProperty":-19,"Access":-20,"Getter":-21,"Enum":-22,"EnumValues":-23,"Const":-24,"ConstVar":-25,"Var":-26,"If":-27,"Else":-28,"Elses":-29,"Loop":-30,"LoopRange":-31,"Switch":-32,"SwitchBody":-33,"SwitchCases":-34,"CaseOption":-35,"Try":-36,"Super":-37,"Array":-38,"ArrayElements":-39,"Object":-40,"ObjectLines":-41,"ObjectPair":-42,"Hon":-43,"HonVars":-44,"HonChilds":-45,"HonElements":-46,"HonElement":-47,"Eol":-48,"Value":-49,"INDENT":1,"OUTDENT":2,"CONTINUE":3,"BREAK":4,"RETURN":5,"DEBUGGER":6,"THROW":7,",":8,"WITH":9,"IF":10,"EXPORT":11,"TAG":12,"DEFAULT":13,"CALLIN":14,"CALLOUT":15,"MCOMMENT":16,"COMMENT":17,"EMPTYLINE":18,"THIS":19,"NEW":20,"AWAIT":21,"?":22,":":23,"(":24,")":25,".":26,"[":27,"]":28,"=":29,"ASSIGN_OP":30,"+-":31,"+":32,"-":33,"~":34,"DELETE":35,"VOID":36,"TYPEOF":37,"NOT":38,"ARITHMETIC_PREC":39,"INSTANCEOF":40,"LOGICAL":41,"BINARY_OP":42,"COMPARE":43,"IN":44,"IMPORT":45,"STRING":46,"FROM":47,"AS":48,"->":49,"CLASS":50,"STATIC":51,"PUBLIC":52,"PROTECTED":53,"PRIVATE":54,"GET":55,"SET":56,"ENUM":57,"CONST":58,"ELSE":59,"DO":60,"WHILE":61,"FOR":62,"BY":63,"..":64,"..<":65,"SWITCH":66,"CASE":67,"TRY":68,"CATCH":69,"FINALLY":70,"SUPER":71,"{":72,"}":73,"NUMBER":74,"LOOP":75,"HON":76,";":77,"EOL":78,"NULL":79,"BOOLEAN":80,"UNDEFINED":81,"REGEXP":82,"NAN":83};
var rules = [[-1, 2],[-2, 1],[-3, 1],[-3, 2],[-4, 2],[-4, 2],[-5, 2],[-5, 3],[-6, 1],[-6, 1],[-6, 1],[-6, 2],[-6, 1],[-6, 2],[-6, 4],[-6, 6],[-6, 3],[-6, 1],[-6, 3],[-6, 3],[-6, 1],[-6, 1],[-6, 1],[-6, 1],[-6, 2],[-6, 3],[-6, 3],[-6, 2],[-6, 5],[-6, 3],[-6, 1],[-6, 1],[-6, 1],[-6, 1],[-7, 1],[-7, 1],[-7, 1],[-7, 1],[-7, 1],[-7, 2],[-7, 1],[-7, 2],[-7, 1],[-7, 1],[-7, 2],[-7, 3],[-7, 5],[-7, 3],[-7, 3],[-7, 3],[-7, 3],[-7, 4],[-7, 3],[-7, 3],[-7, 1],[-7, 1],[-8, 2],[-8, 2],[-8, 2],[-8, 2],[-8, 2],[-8, 2],[-8, 2],[-8, 2],[-8, 2],[-8, 3],[-8, 3],[-8, 3],[-8, 3],[-8, 3],[-8, 3],[-8, 3],[-8, 3],[-9, 2],[-9, 2],[-9, 4],[-9, 4],[-10, 1],[-10, 3],[-10, 3],[-10, 5],[-11, 3],[-11, 4],[-12, 1],[-12, 3],[-13, 2],[-13, 4],[-13, 5],[-13, 7],[-13, 5],[-13, 4],[-13, 5],[-13, 7],[-13, 5],[-14, 3],[-14, 5],[-14, 5],[-14, 7],[-14, 3],[-14, 5],[-15, 1],[-15, 1],[-15, 1],[-15, 2],[-15, 2],[-15, 1],[-16, 2],[-16, 4],[-16, 5],[-16, 7],[-17, 1],[-17, 2],[-18, 1],[-18, 2],[-18, 2],[-18, 3],[-18, 2],[-18, 2],[-18, 2],[-19, 2],[-19, 2],[-19, 2],[-19, 3],[-19, 5],[-19, 4],[-19, 6],[-20, 1],[-20, 1],[-20, 1],[-21, 1],[-21, 1],[-22, 3],[-23, 1],[-23, 3],[-23, 3],[-23, 5],[-24, 2],[-25, 3],[-25, 5],[-26, 1],[-26, 3],[-26, 3],[-26, 5],[-27, 3],[-27, 4],[-28, 2],[-28, 2],[-28, 3],[-28, 3],[-28, 1],[-29, 3],[-29, 4],[-30, 5],[-30, 3],[-30, 5],[-30, 7],[-30, 9],[-30, 8],[-30, 7],[-30, 8],[-30, 6],[-30, 3],[-30, 5],[-31, 5],[-31, 5],[-31, 3],[-31, 3],[-32, 5],[-33, 2],[-33, 3],[-33, 3],[-33, 4],[-33, 5],[-34, 3],[-34, 2],[-34, 1],[-34, 1],[-34, 1],[-34, 5],[-34, 4],[-34, 4],[-34, 3],[-34, 3],[-34, 3],[-34, 3],[-35, 1],[-35, 3],[-36, 4],[-36, 5],[-36, 4],[-36, 6],[-36, 7],[-37, 1],[-37, 3],[-37, 4],[-38, 2],[-38, 3],[-39, 1],[-39, 1],[-39, 1],[-39, 1],[-39, 3],[-39, 3],[-39, 3],[-39, 3],[-40, 2],[-40, 3],[-40, 3],[-40, 4],[-40, 4],[-40, 7],[-41, 1],[-41, 3],[-41, 3],[-41, 3],[-41, 3],[-41, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-42, 3],[-43, 2],[-43, 3],[-43, 3],[-43, 4],[-43, 2],[-43, 3],[-43, 3],[-43, 4],[-44, 1],[-44, 3],[-45, 3],[-46, 2],[-46, 2],[-46, 2],[-46, 2],[-46, 3],[-46, 3],[-46, 3],[-46, 3],[-47, 4],[-47, 2],[-47, 5],[-47, 2],[-47, 2],[-47, 3],[-48, 1],[-48, 1],[-49, 1],[-49, 1],[-49, 1],[-49, 1],[-49, 1],[-49, 1],[-49, 1],]; 
var F = Funcs; 
class MetabParser extends Parser{ constructor(...args) { super(...args); this.funcs = [ ,() => {
						return new F.Document(this.$1);
					},() => {
						return [
							this.$1
						];
					},() => {
						return F.Concat(this.$1, [
							this.$2
						]);
					},,,() => {
						return new F.Block([], true, [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						return new F.Block(this.$2, true, [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						return new F.Continue(this.Loc);
					},() => {
						return new F.Break(this.Loc);
					},() => {
						return new F.Return(null, this.Loc);
					},() => {
						return new F.Return(this.$2, this.LocN1);
					},() => {
						return new F.Reserved('debugger;', this.Loc);
					},() => {
						return new F.Throw(this.$2, this.LocN1);
					},() => {
						return new F.Throw(this.$2, this.LocN1);
					},() => {
						return new F.Throw(this.$2, this.LocN1);
					},() => {
						return new F.With(this.$2, this.$3, this.LocN1);
					},,() => {
						var blockRange;
						if (true) {
							blockRange = JSON.parse(JSON.stringify([
								this.LocN2,
								this.LocN3
							]));
						}
						if (true) {
							blockRange[0].toCol = blockRange[1].toCol = 0;
						}
						return new F.If((this.$2 === 'if'), this.$3, (new F.Block([
							this.$1
						], false, blockRange)), null, this.LocN2);
					},() => {
						var blockRange;
						if (true) {
							blockRange = JSON.parse(JSON.stringify([
								this.LocN2,
								this.LocN3
							]));
						}
						if (true) {
							blockRange[0].toCol = blockRange[1].toCol = 0;
						}
						return new F.If((this.$2 === 'if'), this.$3, (new F.Block([
							this.$1
						], false, blockRange)), null, this.LocN2);
					},,,,,() => {
						return new F.Export(this.$2, null, this.LocN1);
					},() => {
						return new F.Export(this.$3, this.$2, this.LocN1);
					},() => {
						return new F.Export(this.$3, this.$2, this.LocN1);
					},() => {
						return new F.Export(this.$2, null, this.LocN1);
					},() => {
						return new F.Export(this.$4, this.$2, this.LocN1);
					},() => {
						return new F.Export(this.$3, this.$2, this.LocN1);
					},,() => {
						return new F.Comment(this.$1, true, this.Loc);
					},() => {
						return new F.Comment(this.$1, false, this.Loc);
					},() => {
						return new F.EmptyLine(this.$1, this.Loc);
					},() => {
						return new F.Tag(this.$1, this.Loc);
					},() => {
						return new F.This(this.$1, this.Loc);
					},,,,() => {
						return new F.New(this.$2, this.LocN1);
					},,() => {
						return new F.Await(this.$2, this.LocN1);
					},,,() => {
						return new F.Exist(this.$1, null, this.LocN2);
					},() => {
						return new F.Exist(this.$1, this.$3, this.LocN2);
					},() => {
						return new F.InlineIf(this.$1, this.$3, this.$5, [
							this.LocN2,
							this.LocN4
						]);
					},() => {
						return new F.InlineIf(this.$1, this.$3[0][0], this.$3[0][1], [
							this.LocN2,
							this.LocN3
						]);
					},() => {
						return new F.Paren(this.$2, [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						return new F.Paren((new F.Tag(this.$2, this.LocN2)), [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						return new F.Property(this.$1, this.$3, this.LocN2);
					},() => {
						return new F.Index(this.$1, this.$3, [
							this.LocN2,
							this.LocN4
						]);
					},() => {
						return new F.Assignament(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Assignament(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},,() => {
						return this.$1;
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)));
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op('!', this.LocN1)), this.$2);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.Operation(this.$1, (new F.Op(this.$2, this.LocN2)), this.$3);
					},() => {
						return new F.In(this.$1, this.$3, this.LocN2);
					},() => {
						return new F.Import(this.$2, null, this.Loc);
					},() => {
						return new F.Import('"' + (this.$2) + '"', null, this.Loc);
					},() => {
						return new F.Import(this.$4, this.$2, this.Loc);
					},() => {
						return new F.Import('"' + (this.$4) + '"', this.$2, this.Loc);
					},() => {
						return [
							[
								this.$1
							]
						];
					},() => {
						return [
							[
								this.$1,
								this.$3
							]
						];
					},() => {
						return F.Concat(this.$1, [
							[
								this.$3
							]
						]);
					},() => {
						return F.Concat(this.$1, [
							[
								this.$3,
								this.$5
							]
						]);
					},() => {
						return new F.Call(this.$1, [], [
							this.LocN2,
							this.LocN3
						]);
					},() => {
						return new F.Call(this.$1, this.$3, [
							this.LocN2,
							this.LocN4
						]);
					},() => {
						return [
							[
								this.$1,
								this.Loc
							]
						];
					},() => {
						return F.Concat(this.$1, [
							[
								this.$3,
								this.LocN2
							]
						]);
					},() => {
						return new F.Function(null, null, (this.$1 === '-->'), (this.$1 === '--->'), this.$2, this.LocN1);
					},() => {
						return new F.Function(null, null, (this.$3 === '-->'), (this.$3 === '--->'), this.$4, this.LocN3);
					},() => {
						return new F.Function(null, [
							new F.FunctionParam(this.$2, null, this.LocN2)
						], (this.$4 === '-->'), (this.$4 === '--->'), this.$5, this.LocN4);
					},() => {
						return new F.Function(null, [
							new F.FunctionParam(this.$2, this.$4, [
								this.LocN2,
								this.LocN3
							])
						], (this.$6 === '-->'), (this.$6 === '--->'), this.$7, this.LocN6);
					},() => {
						return new F.Function(null, this.$2, (this.$4 === '-->'), (this.$4 === '--->'), this.$5, this.LocN4);
					},() => {
						return new F.Function(null, null, (this.$3 === '-->'), (this.$3 === '--->'), this.$4, this.LocN3);
					},() => {
						return new F.Function(null, [
							new F.FunctionParam(this.$2, null, this.LocN2)
						], (this.$4 === '-->'), (this.$4 === '--->'), this.$5, this.LocN4);
					},() => {
						return new F.Function(null, [
							new F.FunctionParam(this.$2, this.$4, [
								this.LocN2,
								this.LocN3
							])
						], (this.$6 === '-->'), (this.$6 === '--->'), this.$7, this.LocN6);
					},() => {
						return new F.Function(null, this.$2, (this.$4 === '-->'), (this.$4 === '--->'), this.$5, this.LocN4);
					},() => {
						return [
							(new F.FunctionParam(this.$1, null, this.LocN1)),
							(new F.FunctionParam(this.$3, null, [
								this.LocN2,
								this.LocN3
							]))
						];
					},() => {
						return [
							(new F.FunctionParam(this.$1, this.$3, [
								this.LocN1,
								this.LocN2
							])),
							(new F.FunctionParam(this.$5, null, [
								this.LocN4,
								this.LocN5
							]))
						];
					},() => {
						return [
							(new F.FunctionParam(this.$1, null, this.LocN1)),
							(new F.FunctionParam(this.$3, this.$5, [
								this.LocN2,
								this.LocN3,
								this.LocN4
							]))
						];
					},() => {
						return [
							(new F.FunctionParam(this.$1, this.$3, [
								this.LocN1,
								this.LocN2
							])),
							(new F.FunctionParam(this.$5, this.$7, [
								this.LocN4,
								this.LocN5,
								this.LocN6
							]))
						];
					},() => {
						return F.Concat(this.$1, [
							new F.FunctionParam(this.$3, null, [
								this.LocN2,
								this.LocN3
							])
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.FunctionParam(this.$3, this.$5, [
								this.LocN2,
								this.LocN3,
								this.LocN4
							])
						]);
					},,,,() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},() => {
						return new F.Operation((new F.Op(this.$1, this.LocN1)), this.$2);
					},,() => {
						return new F.Class((new F.Tag(this.$2, this.LocN2)), null, [], [
							this.LocN1
						]);
					},() => {
						return new F.Class((new F.Tag(this.$2, this.LocN2)), (new F.Tag(this.$4, this.LocN4)), [], [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						return new F.Class((new F.Tag(this.$2, this.LocN2)), null, this.$4, [
							this.LocN1,
							null,
							this.LocN3,
							this.LocN5
						]);
					},() => {
						return new F.Class((new F.Tag(this.$2, this.LocN2)), (new F.Tag(this.$4, this.LocN4)), this.$6, [
							this.LocN1,
							this.LocN3,
							this.LocN5,
							this.LocN7
						]);
					},,() => {
						return F.Concat(this.$1, this.$2);
					},,() => {
						if (true) {
							for (var i of this.$2) i.Static = true
						}
						return this.$2;
					},() => {
						if (true) {
							for (var i of this.$2) i.Access = this.$1
						}
						return this.$2;
					},() => {
						if (true) {
							for (var i of this.$3) {
								if (true) {
									i.Access = this.$1;
								}
								i.Static = true;
							}
						}
						return this.$3;
					},() => {
						return new F.Comment(this.$1, true, this.LocN1);
					},() => {
						return new F.Comment(this.$1, false, this.LocN1);
					},() => {
						return new F.EmptyLine(this.$1, this.Loc);
					},() => {
						return [
							this.$1
						];
					},,,() => {
						if (true) {
							this.$2.Name = new F.Tag(this.$1, this.LocN1);
						}
						return [
							this.$2
						];
					},() => {
						if (true) {
							this.$3.Name = new F.Tag(this.$1, this.LocN1);
						}
						return [
							this.$3
						];
					},() => {
						if (true) {
							this.$3.Name = new F.Tag(this.$2, this.LocN2);
						}
						if (true) {
							this.$3.Getter = this.$1;
						}
						if (true) {
							this.$3.GetterL = this.LocN1;
						}
						return [
							this.$3
						];
					},() => {
						if (true) {
							this.$4.Name = new F.Tag(this.$2, this.LocN2);
						}
						if (true) {
							this.$4.Getter = this.$1;
						}
						if (true) {
							this.$4.GetterL = this.LocN1;
						}
						return [
							this.$4
						];
					},,,,,,() => {
						return new F.Enum((new F.Tag(this.$2, this.LocN2)), this.$3, [
							this.LocN3,
							this.LocN3
						]);
					},() => {
						return [
							new F.EnumValue((new F.Tag(this.$1, this.Loc)), null, this.Loc)
						];
					},() => {
						return [
							new F.EnumValue((new F.Tag(this.$1, this.LocN1)), this.$3, [
								this.LocN1,
								this.LocN2
							])
						];
					},() => {
						return F.Concat(this.$1, [
							new F.EnumValue((new F.Tag(this.$3, this.LocN3)), null, [
								this.LocN3,
								null,
								this.LocN2
							])
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.EnumValue((new F.Tag(this.$3, this.LocN3)), this.$5, [
								this.LocN3,
								this.LocN4,
								this.LocN2
							])
						]);
					},() => {
						return this.$2;
					},() => {
						return [
							new F.Const((new F.Tag(this.$1, this.LocN1)), this.$3, this.LocN2)
						];
					},() => {
						return F.Concat(this.$1, [
							new F.Const((new F.Tag(this.$3, this.LocN3)), this.$5, [
								this.LocN2,
								this.LocN4
							])
						]);
					},() => {
						return [
							new F.Var((new F.Tag(this.$1, this.Loc)))
						];
					},() => {
						return [
							new F.Var((new F.Tag(this.$1, this.LocN1)), this.$3, this.LocN2)
						];
					},() => {
						return F.Concat(this.$1, [
							new F.Var((new F.Tag(this.$3, this.LocN3)), null, this.LocN2)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.Var((new F.Tag(this.$3, this.LocN3)), this.$5, [
								this.LocN2,
								this.LocN4
							])
						]);
					},() => {
						if (true) {
							this.$3.Inline = false;
						}
						return new F.If((this.$1 === 'if'), this.$2, this.$3, null, this.LocN1);
					},() => {
						if (true) {
							this.$3.Inline = false;
						}
						return new F.If((this.$1 === 'if'), this.$2, this.$3, this.$4, this.LocN1);
					},() => {
						if (true) {
							this.$2.Inline = false;
						}
						return new F.Else(this.$2, this.LocN1);
					},() => {
						var blockRange;
						if (true) {
							blockRange = JSON.parse(JSON.stringify([
								this.LocN1,
								this.LocN2
							]));
						}
						if (true) {
							blockRange[0].toColumn = blockRange[1].toColumn = 0;
						}
						return new F.Else((new F.Block([
							this.$2
						], false, blockRange)), this.LocN1);
					},() => {
						if (true) {
							this.$3.Inline = false;
						}
						if (true) {
							this.$1.Next.Else = new F.Else(this.$3, this.LocN2);
						}
						if (true) {
							this.$1.Next = this.$1.Next.Else.Body.Body[0];
						}
						return this.$1;
					},() => {
						var blockRange;
						if (true) {
							blockRange = JSON.parse(JSON.stringify([
								this.LocN2,
								this.LocN3
							]));
						}
						if (true) {
							blockRange[0].toColumn = blockRange[1].toColumn = 0;
						}
						if (true) {
							this.$1.Next.Else = new F.Else((new F.Block([
								this.$3
							], false, blockRange)), this.LocN2);
						}
						if (true) {
							this.$1.Next = this.$1.Next.Else.Body.Body[0];
						}
						return this.$1;
					},,() => {
						var blockRange,e;
						if (true) {
							this.$3.Inline = false;
						}
						if (true) {
							blockRange = JSON.parse(JSON.stringify([
								this.LocN2,
								this.LocN3
							]));
						}
						if (true) {
							blockRange[0].toColumn = blockRange[1].toColumn = 0;
						}
						if (true) {
							e = new F.Else((new F.Block([
								(new F.If(true, this.$2, this.$3, null, JSON.parse(JSON.stringify(this.LocN2))))
							], false, blockRange)), this.LocN1);
						}
						if (true) {
							e.Next = e.Body.Body[0];
						}
						return e;
					},() => {
						var blockRange;
						if (true) {
							this.$4.Inline = false;
						}
						if (true) {
							blockRange = JSON.parse(JSON.stringify([
								this.LocN3,
								this.LocN4
							]));
						}
						if (true) {
							blockRange[0].toColumn = blockRange[1].toColumn = 0;
						}
						if (true) {
							this.$1.Next.Else = new F.Else((new F.Block([
								(new F.If(true, this.$3, this.$4, null, JSON.parse(JSON.stringify(this.LocN3))))
							], false, blockRange)), this.LocN2);
						}
						if (true) {
							this.$1.Next = this.$1.Next.Else.Body.Body[0];
						}
						return this.$1;
					},() => {
						return new F.Do(this.$2, this.$5, [
							this.LocN1,
							this.LocN4
						]);
					},() => {
						return new F.While(this.$2, this.$3, this.LocN1);
					},() => {
						return new F.For((new F.Tag(this.$2, this.LocN2)), null, null, this.$4, this.$5, this.LocN1);
					},() => {
						return new F.For((new F.Tag(this.$2, this.LocN2)), (new F.Tag(this.$4, this.LocN4)), null, this.$6, this.$7, this.LocN1);
					},() => {
						return new F.For((new F.Tag(this.$2, this.LocN2)), (new F.Tag(this.$4, this.LocN4)), (new F.Tag(this.$6, this.LocN6)), this.$8, this.$9, this.LocN1);
					},() => {
						return new F.For(null, (new F.Tag(this.$3, this.LocN3)), (new F.Tag(this.$5, this.LocN5)), this.$7, this.$8, this.LocN1);
					},() => {
						return new F.For(null, null, (new F.Tag(this.$4, this.LocN4)), this.$6, this.$7, this.LocN1);
					},() => {
						return new F.For((new F.Tag(this.$2, this.LocN2)), null, (new F.Tag(this.$5, this.LocN5)), this.$7, this.$8, this.LocN1);
					},() => {
						return new F.For(null, (new F.Tag(this.$3, this.LocN3)), null, this.$5, this.$6, this.LocN1);
					},() => {
						return new F.ForRange(this.$2[0], this.$2[1], this.$2[2], this.$2[3], null, this.$3, this.LocN1);
					},() => {
						return new F.ForRange(this.$2[0], this.$2[1], this.$2[2], this.$2[3], this.$4, this.$5, this.LocN1);
					},() => {
						return [
							(new F.Tag(this.$1, this.LocN1)),
							true,
							this.$3,
							this.$5
						];
					},() => {
						return [
							(new F.Tag(this.$1, this.LocN1)),
							false,
							this.$3,
							this.$5
						];
					},() => {
						return [
							null,
							true,
							this.$1,
							this.$3
						];
					},() => {
						return [
							null,
							false,
							this.$1,
							this.$3
						];
					},() => {
						return new F.Switch(this.$2, this.$4, [
							this.LocN1,
							this.LocN3,
							this.LocN5
						]);
					},,() => {
						return [
							[
								this.$2
							]
						];
					},() => {
						return [
							[
								this.$2
							]
						];
					},() => {
						return F.Concat(this.$1, [
							[
								this.$3
							]
						]);
					},() => {
						return F.Concat(this.$1, [
							[
								this.$4
							]
						]);
					},() => {
						return [
							[
								this.$2,
								this.$3
							]
						];
					},() => {
						return [
							[
								this.$1,
								this.$2
							]
						];
					},() => {
						return [
							new F.Comment(this.$1, true, this.Loc)
						];
					},() => {
						return [
							new F.Comment(this.$1, false, this.Loc)
						];
					},() => {
						return [
							new F.EmptyLine(this.$1, this.Loc)
						];
					},() => {
						return F.Concat(this.$1, [
							[
								this.$4,
								this.$5
							]
						]);
					},,() => {
						return F.Concat(this.$1, [
							[
								this.$3,
								this.$4
							]
						]);
					},,() => {
						return F.Concat(this.$1, [
							new F.Comment(this.$3, true, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.Comment(this.$3, false, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.EmptyLine(this.$3, this.Loc)
						]);
					},() => {
						return [
							this.$1
						];
					},() => {
						return F.Concat(this.$1, [
							this.$3
						]);
					},() => {
						if (true) {
							this.$2.Inline = this.$4.Inline = false;
						}
						return new F.Try(this.$2, null, this.$4, null, [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						if (true) {
							this.$2.Inline = this.$5.Inline = false;
						}
						return new F.Try(this.$2, (new F.Tag(this.$4, this.LocN4)), this.$5, null, [
							this.LocN1,
							this.LocN3
						]);
					},() => {
						if (true) {
							this.$2.Inline = this.$4.Inline = false;
						}
						return new F.Try(this.$2, null, null, this.$4, [
							this.LocN1,
							null,
							this.LocN3
						]);
					},() => {
						if (true) {
							this.$2.Inline = this.$4.Inline = this.$6.Inline = false;
						}
						return new F.Try(this.$2, null, this.$4, this.$6, [
							this.LocN1,
							this.LocN3,
							this.LocN5
						]);
					},() => {
						if (true) {
							this.$2.Inline = this.$5.Inline = this.$7.Inline = false;
						}
						return new F.Try(this.$2, (new F.Tag(this.$4, this.LocN4)), this.$5, this.$7, [
							this.LocN1,
							this.LocN3,
							this.LocN6
						]);
					},() => {
						return new F.Super(null, [
							this.Loc,
							this.Loc,
							this.Loc
						]);
					},() => {
						return new F.Super([], [
							this.LocN1,
							this.LocN2,
							this.LocN3
						]);
					},() => {
						return new F.Super(this.$3, [
							this.LocN1,
							this.LocN2,
							this.LocN4
						]);
					},() => {
						return new F.Arra([], this.Loc);
					},() => {
						return new F.Arra(this.$2, this.Loc);
					},() => {
						return [
							this.$1
						];
					},() => {
						return [
							new F.Comment(this.$1, true, this.Loc)
						];
					},() => {
						return [
							new F.Comment(this.$1, false, this.Loc)
						];
					},() => {
						return [
							new F.EmptyLine(this.$1, this.Loc)
						];
					},() => {
						return F.Concat(this.$1, this.$3);
					},() => {
						return F.Concat(this.$1, [
							new F.Comment(this.$3, true, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.Comment(this.$3, false, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.EmptyLine(this.$3, this.Loc)
						]);
					},() => {
						return new F.Objt([], this.Loc);
					},() => {
						return new F.Objt([], this.Loc);
					},() => {
						return new F.Objt(this.$2, this.Loc);
					},() => {
						return new F.Objt(this.$2, this.Loc);
					},() => {
						return new F.Objt(this.$2, this.Loc);
					},() => {
						return new F.Objt(this.$3, this.Loc);
					},,() => {
						return F.Concat(this.$1, this.$3);
					},() => {
						return F.Concat(this.$1, this.$3);
					},() => {
						return F.Concat(this.$1, [
							new F.EmptyLine(this.$3, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.Comment(this.$3, true, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.Comment(this.$3, false, this.Loc)
						]);
					},() => {
						return [
							[
								(new F.String(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Tag(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Number(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return [
							[
								(new F.Reserved(this.$1, this.LocN1)),
								this.$3
							]
						];
					},() => {
						return new F.Hon((new F.String('"' + this.$2 + '"', this.LocN2)), null, null, this.Loc);
					},() => {
						return new F.Hon((new F.String('"' + this.$2 + '"', this.LocN2)), this.$3, null, this.Loc);
					},() => {
						return new F.Hon((new F.String('"' + this.$2 + '"', this.LocN2)), null, this.$3, this.Loc);
					},() => {
						return new F.Hon((new F.String('"' + this.$2 + '"', this.LocN2)), this.$3, this.$4, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$2, this.LocN2)), null, null, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$2, this.LocN2)), this.$3, null, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$2, this.LocN2)), null, this.$3, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$2, this.LocN2)), this.$3, this.$4, this.Loc);
					},,() => {
						return F.Concat(this.$1, this.$3);
					},() => {
						return this.$2;
					},() => {
						return [
							new F.Hon((new F.String('"' + this.$1 + '"', this.LocN1)), null, null, this.Loc)
						];
					},() => {
						return [
							new F.Hon((new F.String(this.$1, this.LocN1)), null, null, this.Loc)
						];
					},() => {
						return [
							new F.EmptyLine(this.$1, this.Loc)
						];
					},() => {
						return [
							this.$1
						];
					},() => {
						return F.Concat(this.$1, this.$2);
					},() => {
						return F.Concat(this.$1, [
							new F.Hon((new F.String('"' + this.$2 + '"', this.LocN2)), null, null, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.Hon((new F.String(this.$2, this.LocN2)), null, null, this.Loc)
						]);
					},() => {
						return F.Concat(this.$1, [
							new F.EmptyLine(this.$2, this.Loc)
						]);
					},() => {
						return new F.Hon((new F.String('"' + this.$1 + '"', this.LocN1)), this.$3, null, this.Loc);
					},() => {
						return new F.Hon((new F.String('"' + this.$1 + '"', this.LocN1)), null, this.$2, this.Loc);
					},() => {
						return new F.Hon((new F.String('"' + this.$1 + '"', this.LocN1)), this.$3, this.$5, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$1, this.LocN1)), this.$2, null, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$1, this.LocN1)), null, this.$2, this.Loc);
					},() => {
						return new F.Hon((new F.String(this.$1, this.LocN1)), this.$2, this.$3, this.Loc);
					},,,() => {
						return new F.Reserved(this.$1, this.Loc);
					},() => {
						return new F.Boolean(this.$1, this.Loc);
					},() => {
						return new F.Number(this.$1, this.Loc);
					},() => {
						return new F.String(this.$1, this.Loc);
					},() => {
						return new F.Reserved(this.$1, this.Loc);
					},() => {
						return new F.Reserved(this.$1, this.Loc);
					},() => {
						return new F.Reserved(this.$1, this.Loc);
					} ]; if(!(this.constructor.prototype instanceof MetabParser) && this.init)return this.init(...args); } parse(tokens,grammar) 	{ return this.parseFunc(tokens, tableTerm, tableNonTerm, terms, this.funcs, rules, grammar); }  }var lexer,parser,fs,path;





class Lexer {
	constructor(...args) {
		this.tokens = null;
		this.l = 1;
		this.c = 1;
		this.s = null;
		if(!(this.constructor.prototype instanceof Lexer) && this.init)return this.init(...args);
	}

	parseRules(str, rules) {
		var size,tok;
		this.tokens = [];
		this.l = 1;
		this.c = 1;
		this.s = str;

		while (this.s.length > 0) {
			size = rules();

			if (size > 0) {
				this.advance(size);
			}
			else {

				tok = this.s.substr(0, 30);
				var i=0
				for (var char of tok) {
					if ([
						'\n',
						'\t',
						' ',
						'.'
					].includes(char)) {
						tok = tok.substr(0, i);
						break;
					}
					i++;
				}

				this.error('unexpected token ' + tok);
				break;
			}
		}

		this.eof();



		return this.tokens;
	}

	eof() {
		this.addToken('EOF');
	}

	advance(n) {
		var i;

		i = 0;
		while (i < n) {
			if (this.s[i] === '\n') {
				this.l++;
				this.c = 1;
			}
			else {
				this.c++;
			}
			i++;
		}
		this.s = this.s.substr(n);

	}

	addToken(type, val) {
		var __v,lines;
		val = (typeof val !== 'undefined' && val !== null) ? val : type;
		lines = val.split('\n');
		if (lines === 1) {
			this.tokens.push([
				type.toUpperCase(),
				val,
				{
					firstLine : this.l - 1,
					firstCol : this.c - 1,
					lastLine : this.l - 1,
					lastCol : this.c + val.length - 1
				}
			]);
		}
		else {
			this.tokens.push([
				type.toUpperCase(),
				val,
				{
					firstLine : this.l - 1,
					firstCol : this.c - 1,
					lastLine : this.l + lines.length - 1 - 1,
					lastCol : lines[lines.length - 1].length
				}
			]);
		}
	}

	removeLastToken() {
		return this.tokens.pop();
	}

	error(m) {
		throw this.l + ":" + this.c + ' ' + m;
	}

	addTokenExp(ss, name, exp) {
		var r;
		r = this.parseExp(ss, exp);
		if (r !== null) {
			this.addToken(name, r);

			return r.length;
		}
		return 0;
	}

	addTokenOne(ss, name, list) {
		var r;
		r = this.parseOne(ss, list);
		if (r !== null) {
			this.addToken(name, r);

			return r.length;
		}
		return 0;
	}

	addTokenChar(ss, name, char) {
		var __v;
		if (this.parseChar(ss, (typeof char !== 'undefined' && char !== null) ? char : name) === 1) {
			this.addToken(name, char);

			return 1;
		}
		return 0;
	}

	addTokenWord(ss, name, word) {
		var r,__v;
		r = this.parseWord(ss, (typeof word !== 'undefined' && word !== null) ? word : name);
		if (r !== null) {
			this.addToken(name, word);

			return word? word.length : name.length;
		}
		return 0;
	}

	testExp(ss, exp) {
		return (new RegExp(exp)).test(ss);
	}

	parseExp(ss, exp) {
		var r;
		r = ss.match(new RegExp(exp));
		if (r !== null) {
			return r[0];
		}

		return null;
	}

	parseOne(ss, list) {
		for (var i of list) {
			if (ss.substr(0, i.length) === i) {
				return i;
			}
		}
		return null;
	}

	parseChar(ss, c) {
		if (ss[0] === c) {
			return 1;
		}
		return null;
	}

	parseWord(ss, c) {
		if (ss.indexOf(c) === 0) {
			return c;
		}
		return null;
	}

	get lastTokenType() {
		if (this.tokens.length > 0) {
			return this.tokens[this.tokens.length - 1][0];
		}
		else {
			return null;
		}
	}

	get lastTokenValue() {
		if (this.tokens.length > 0) {
			return this.tokens[this.tokens.length - 1][1];
		}
		else {
			return null;
		}
	}

	get lastLastTokenType() {
		if (this.tokens.length > 1) {
			return this.tokens[this.tokens.length - 2][0];
		}
		else {
			return null;
		}
	}

	get lastLastTokenValue() {
		if (this.tokens.length > 1) {
			return this.tokens[this.tokens.length - 2][1];
		}
		else {
			return null;
		}
	}

}






class MetabLexer extends Lexer {
	constructor(...args) {
		super(...args);

		this.openStrings = null;
		this.openStringsDouble = null;

		this.indentFound = null;
		this.indentType = null;
		this.lastIndent = null;
		this.readIndent = null;

		this.stack = null;
		this.currentState = null;

		this.stringBraces = null;
		if(!(this.constructor.prototype instanceof MetabLexer) && this.init)return this.init(...args);
	}

	parseRules(str, rules) {
		var res,finalEof;
		res = Lexer.prototype.parseRules.call(this,str,rules);


		if (res.length > 1 && res[res.length - 2][0] !== 'EOL') {
			finalEof = res.pop();
			res.push([
				'EOL',
				'\n',
				finalEof[2]
			]);
			res.push(finalEof);
		}

		return res;
	}


	parse(ss) {
		this.openStrings = [];
		this.openStringsDouble = [];

		this.indentFound = false;
		this.indentType = '\t';
		this.lastIndent = '';
		this.readIndent = false;

		this.currentState = null;

		this.stringBraces = 0;

		this.stack = [];
		return this.parseRules(ss, () => {

			return this.emptyLine() || this.findIndentType() || this.spaces() || this.indents() || this.strings() || this.comments() || this.regularExpression() || this.Return() || this.methodDefine() || this.comma() || this.groups() || this.number() || this.If() || this.booleans() || this.reserved() || this.incDecOperator() || this.logicalOperator() || this.compareOperator() || this.assignament() || this.binaryOperator() || this.arithmeticPrecOperator() || this.arithmeticOperator() || this.addTokenWord(this.s, '..<') || this.addTokenWord(this.s, '..') || this.indexes() || this.tag() || this.eol() || this.Await() || this.addTokenChar(this.s, '?') || this.prototype() || this.addTokenChar(this.s, ':') || this.addTokenChar(this.s, ';') || this.addTokenChar(this.s, '!') || this.addTokenChar(this.s, '~') || this.addTokenChar(this.s, '}') || this.addTokenChar(this.s, '{');
		});
	}

	addToken(type, val) {
		if (type === ';') {
			type = 'EOL';
			val = ';';
		}

		if (this.lastTokenType === 'EOL' && type === 'EOL') {
			return;
		}

		if (this.lastTokenType === 'SPACE' && type === 'SPACE') {
			return;
		}


		if (this.lastTokenType === 'OUTDENT' && !([
			',',
			')',
			'EOL'
		].includes(type)) ) {
			this.addToken('EOL', '\n');
		}

		Lexer.prototype.addToken.call(this,type,val);
	}




	eof(...args) {
		var t,tokensToParse,nextTokenType,nextNextTokenType,cur,nex,removed,eolout,outden,state;

		this.stack = [];
		t = 0;
		tokensToParse = this.tokens;
		this.tokens = [];

		nextTokenType = () => {
			if (tokensToParse[t + 1]) {
				return tokensToParse[t + 1][0];
			}
			return null;
		};

		nextNextTokenType = () => {
			if (tokensToParse[t + 2]) {
				return tokensToParse[t + 2][0];
			}
			return null;
		};

		while (t < tokensToParse.length) {
			cur = tokensToParse[t];
			switch( cur[0] ) {
				case 'SPACE': {

					if ((MetabLexer.PRE_AUTO_CALLIN.includes(this.lastTokenType)) && !(MetabLexer.PRE_PRE_AUTO_CALLIN.includes(this.lastLastTokenType))  && (MetabLexer.POST_AUTO_CALLIN.includes(nextTokenType())) && !(([
						'+',
						'-'
					].includes(nextTokenType())) && nextNextTokenType() === 'SPACE') ) {
						cur[0] = 'CALLIN';
						cur[1] = '(';
						this.addToStack(MetabLexer.STATES.AUTO_CALLIN);
					}
					else {
						t++;
						continue;
					}
				}
					break;
				case 'INDENT': {
					if (!([
						'->',
						','
					].includes(this.lastTokenType))) {
						this.closeCallins(cur);
					}


					if ([
						'RETURN',
						',',
						'=',
						'ASSIGN_OP',
						'CALLIN',
						':'
					].includes(this.lastTokenType)) {
						this.addToStack(MetabLexer.STATES.BRACE);
						cur[0] = cur[1] = '{';
					}
					else {
						if ([
							'{',
							'['
						].includes(this.lastTokenType)) {
							t++;
							continue;
						}
						else {
							this.addToStack(MetabLexer.STATES.INDENT);
						}
					}
				}
					break;

				case 'OUTDENT': {
					this.closeCallins(cur);


					if ([
						MetabLexer.STATES.INDENT,
						MetabLexer.STATES.INLINE_INDENT
					].includes(this.lastStackType)) {
						this.stack.pop();
					}
					else {
						if (this.lastStackType === MetabLexer.STATES.BRACE && nextTokenType() !== '}') {
							nex = 1;

							while (tokensToParse[t + nex] && tokensToParse[t + nex][0] === 'EOL' && tokensToParse[t + nex + 1] && tokensToParse[t + nex + 1][0] === 'EMPTYLINE') nex += 2
							if (!(tokensToParse[t + nex] && tokensToParse[t + nex][0] === 'EOL' && tokensToParse[t + nex + 1] && tokensToParse[t + nex + 1][0] === '}')) {
								this.stack.pop();
								cur[0] = cur[1] = '}';
							}
							else {
								t++;
								continue;
							}
						}
						else {
							t++;
							continue;
						}
					}
				}
					break;

				case '(': {
					if ([
						')',
						']',
						'TAG',
						'SUPER',
						'CALLOUT'
					].includes(this.lastTokenType)) {
						cur[0] = 'CALLIN';
						this.addToStack(MetabLexer.STATES.CALLIN);
					}
					else {
						this.addToStack(MetabLexer.STATES.PAREN);
					}
				}; 	break;
				case ')': {
					this.closeCallins(cur);
					this.closeInlineFunction(cur);

					if (this.lastStackType === MetabLexer.STATES.CALLIN) {
						cur[0] = 'CALLOUT';
					}
					this.stack.pop();
				}
					break;
				case '[': this.addToStack(MetabLexer.STATES.SQUARE); 	break;
				case ']': {

					this.closeCallins(cur);
					this.stack.pop();
				}
					break;
				case '{': this.addToStack(MetabLexer.STATES.BRACE); 	break;
				case '}': {

					this.closeCallins(cur);
					this.stack.pop();
				}
					break;
				case 'CALLIN': this.addToStack(MetabLexer.STATES.CALLIN); 	break;
				case 'CALLOUT': this.stack.pop(); 	break;
				case '->': {
					if (nextTokenType() !== 'INDENT') {
						this.tokens.push(cur);

						this.tokens.push([
							'INDENT',
							'INDENT',
							cur[2]
						]);
						this.addToStack(MetabLexer.STATES.INLINE_INDENT);
						t++;
						continue;
					}
				}; 	break;
				case 'IF': this.closeCallins(cur); 	break;
				case 'CATCH': 
				case 'ELSE': 
				case 'FINALLY': {
					if (this.lastTokenType === 'EOL') {


						if (this.lastLastTokenType === 'EMPTYLINE') {
							removed = 0;
							while (this.lastLastTokenType === 'EMPTYLINE') {
								this.removeLastToken();
								this.removeLastToken();
								removed++;
							}

							eolout = this.removeLastToken();
							outden = this.removeLastToken();

							for (var rem = 1 ; 1<removed? rem<=removed : rem>=removed ; 1<removed? rem+= 1 : rem-= 1 ) {
								this.addToken('EMPTYLINE', '');
								this.addToken('EOL', '\n');
							}

							this.addToken('OUTDENT');
						}
						else {
							this.removeLastToken();
						}
					}
				}; 	break;
				case 'EMPTYLINE': {

					if ([
						MetabLexer.STATES.AUTO_CALLIN,
						MetabLexer.STATES.CALLIN
					].includes(this.lastStackType)) {
						while (nextTokenType() === 'EOL' && nextNextTokenType() === 'EMPTYLINE') t += 2

						if (nextTokenType() === 'EOL' && nextNextTokenType() === ',') {
							t += 3;
							continue;
						}
					}


					if ([
						MetabLexer.STATES.PAREN
					].includes(this.lastStackType)) {
						if (this.lastTokenType === 'EOL') {
							this.removeLastToken();
						}

						while (nextTokenType() === 'EOL' && nextNextTokenType() === 'EMPTYLINE') t += 2

						if (nextTokenType() === 'EOL' && nextNextTokenType() === ')') {
							t += 2;
							continue;
						}
					}
				}
					break;
				case 'EOL': {
					if (this.lastTokenType === ',') {
						t++;
						continue;
					}

					this.closeCallins(cur);



					if (this.lastStackType === MetabLexer.STATES.INLINE_INDENT && cur[1] !== ';') {
						this.tokens.push([
							cur[0],
							cur[1],
							cur[2]
						]);
						this.tokens.push([
							'OUTDENT',
							'OUTDENT',
							cur[2]
						]);
						this.stack.pop();
					}

					this.closeCallins(cur);

					if ([
						MetabLexer.STATES.BRACE,
						MetabLexer.STATES.SQUARE,
						MetabLexer.STATES.AUTO_CALLIN,
						MetabLexer.STATES.CALLIN
					].includes(this.lastStackType)) {
						if (!([
							',',
							'OUTDENT',
							'}',
							']'
						].includes(nextTokenType()))) {
							cur[0] = cur[1] = ',';
						}
						else {
							t++;
							continue;
						}
					}

					this.closeCallins(cur);





				}
					break;
			}


			this.tokens.push(cur);
			t++;
		}


		while (this.stack.length > 0) {
			state = this.stack.pop();
			switch( state[0] ) {
				case MetabLexer.STATES.INDENT: {
					if (this.lastTokenType !== 'EOL') {
						this.tokens.push([
							'EOL',
							'\n',
							cur[2]
						]);
					}
					this.tokens.push([
						'OUTDENT',
						'OUTDENT',
						cur[2]
					]);
					if (!([
						MetabLexer.STATES.AUTO_CALLIN,
						MetabLexer.STATES.BRACE
					].includes(this.lastStackType))) {
						this.tokens.push([
							'EOL',
							'\n',
							cur[2]
						]);
					}
				}
					break;
				case MetabLexer.STATES.AUTO_CALLIN: this.tokens.push([
					'CALLOUT',
					')',
					cur[2]
				]); 	break;
				case MetabLexer.STATES.INLINE_INDENT: {
					if (this.lastTokenType !== 'EOL') {
						this.tokens.push([
							'EOL',
							'\n',
							cur[2]
						]);
					}
					this.tokens.push([
						'OUTDENT',
						'OUTDENT',
						cur[2]
					]);
					if (this.lastStackType !== MetabLexer.STATES.AUTO_CALLIN) {
						this.tokens.push([
							'EOL',
							'\n',
							cur[2]
						]);
					}
				}
					break;
				case MetabLexer.STATES.BRACE: this.tokens.push([
					'}',
					'}',
					cur[2]
				]); 	break;
			}
		}


		Lexer.prototype.eof.apply(this,...args);
	}

	closeCallins(t) {
		while (this.lastStackType === MetabLexer.STATES.AUTO_CALLIN) {
			this.tokens.push([
				'CALLOUT',
				')',
				t[2]
			]);
			this.stack.pop();
		}
	}

	closeInlineFunction(t) {
		if (this.lastStackType === MetabLexer.STATES.INLINE_INDENT) {
			this.tokens.push([
				'EOL',
				'\n',
				t[2]
			]);
			this.tokens.push([
				'OUTDENT',
				'OUTDENT',
				t[2]
			]);
			this.stack.pop();
		}
	}

	emptyLine() {
		var r;
		if (this.lastTokenType === 'EOL' || this.tokens.length === 0) {
			r = this.parseExp(this.s, '^[ \\t]*(\\n|$)');

			if (r !== null) {
				if (r[r.length - 1] === '\n' && this.lastTokenValue === ';') {
					this.removeLastToken();
					this.addToken('EOL', '\n');
				}

				this.addToken('EMPTYLINE', '');
				this.addToken('EOL', '\n');

				return r.length;
			}
		}

		if (this.lastTokenType === 'EOL' && this.lastTokenValue === ';') {
			r = this.parseExp(this.s, '^[ \\t]+');

			if (r !== null) {
				return r.length;
			}
		}

		return 0;
	}

	findIndentType() {
		var r;
		if ((!this.indentFound ) && this.lastTokenType === 'EOL') {
			r = this.parseExp(this.s, '^\\t');
			if (r !== null) {
				this.indentType = '\t';
				this.indentFound = true;

			}
			else {
				r = this.parseExp(this.s, '^[ ]+');
				if (r !== null) {
					this.indentType = r;
					this.indentFound = true;

				}
			}
		}
		return 0;
	}


	spaces() {
		var r;
		if (this.lastStackType === MetabLexer.STATES.STRING || this.lastStackType === MetabLexer.STATES.DOUBLE_STRING) {
			if (this.s[0] === ' ' || this.s[0] === '\t') {
				this.addToken(')');
				this.addToken('+');
				this.s = this.s[0] + (this.lastStackType === MetabLexer.STATES.STRING? "'" : '"') + this.s.substr(1);
				this.stack.pop();
				return 1;
			}
		}

		if (this.lastTokenType !== 'EOL') {
			r = this.parseExp(this.s, '^[ \\t]+');
			if (r !== null) {

				this.addToken('SPACE', ' ');
				return r.length;
			}
		}

		return 0;
	}

	indents() {
		var r,indentsToClose,removed;
		if (this.lastTokenType === 'EOL') {


			if (this.lastTokenValue === ';') {
				return 0;
			}

			if (!this.readIndent ) {
				r = this.parseExp(this.s, '^[' + (this.indentType) + ']+');
				indentsToClose = 0;
				if (r !== null) {
					if (this.lastIndent.length === r.length) {
						this.readIndent = true;
						return r.length;
					}
					else {
						if (this.lastIndent.length + (this.indentType.length) === r.length) {

							this.lastIndent += this.indentType;
							this.removeLastToken();


							if (this.lastTokenType === 'EMPTYLINE') {
								removed = 0;
								while (this.lastTokenType === 'EMPTYLINE') {
									this.removeLastToken();
									this.removeLastToken();

									removed++;
								}

								this.addToken('INDENT');

								for (var i = 0 ; 0<removed? i<removed : i>removed ; 0<removed? i+= 1 : i-= 1 ) {
									this.addToken('EMPTYLINE', '');
									this.addToken('EOL', '\n');
								}

								this.readIndent = true;
							}
							else {
								this.addToken('INDENT');
							}

							return r.length;
						}
						else {
							if (this.lastIndent.length > r.length) {
								indentsToClose = 1.0 * (this.lastIndent.length - r.length) / this.indentType.length;
								if (indentsToClose !== parseInt(indentsToClose)) {
									this.error('unexpected indent');
								}
							}
							else {
								this.error('unexpected indent');
							}
						}
					}
				}
				else {
					indentsToClose = this.lastIndent.length;
				}

				if (indentsToClose > 0) {
					for (var i = 1 ; 1<indentsToClose? i<=indentsToClose : i>=indentsToClose ; 1<indentsToClose? i+= 1 : i-= 1 ) {


						if (this.lastTokenType === 'EOL' && this.lastLastTokenType === 'EMPTYLINE' && this.s[0] !== '}') {
							removed = 0;
							while (this.lastLastTokenType === 'EMPTYLINE' && removed < 30) {
								this.removeLastToken();
								this.removeLastToken();

								removed++;
							}

							this.addToken('OUTDENT');

							for (var lines = 1 ; 1<removed? lines<=removed : lines>=removed ; 1<removed? lines+= 1 : lines-= 1 ) {
								this.addToken('EMPTYLINE', '');
								this.addToken('EOL', '\n');
							}
						}
						else {
							this.addToken('OUTDENT');
						}
					}

					this.lastIndent = this.lastIndent.substr(indentsToClose);
					this.readIndent = true;
					return r? r.length : 0;
				}
			}
		}
		else {
			this.readIndent = false;
		}

		return 0;
	}

	eol() {
		var r;
		if (this.s[0] === '\n') {
			if (this.lastTokenType === 'SPACE') {
				this.removeLastToken();
			}

			if (MetabLexer.LINE_UNIONS.includes(this.lastTokenType)) {
				r = this.parseExp(this.s, '^[ \\t]*[\\n|$]+');
				if (r !== null) {
					this.addToken('SPACE', ' ');
					return r.length;
				}
			}

			this.addToken('EOL', '\n');


			return 1;
		}

		return 0;
	}

	strings() {
		var i;
		if (this.lastStackType === MetabLexer.STATES.STRING_IN || this.lastStackType === MetabLexer.STATES.DOUBLE_STRING_IN) {
			if (this.s[0] === '{') {
				this.stringBraces++;
			}
			else {
				if (this.s[0] === '}') {
					if (this.stringBraces === 0) {
						Lexer.prototype.addToken.call(this, ')');
						this.addToken('+');
						this.s = this.s[0] + (this.lastStackType === MetabLexer.STATES.STRING_IN? "'" : '"') + this.s.substr(1);
						this.stack.pop();
						return 1;
					}
					else {
						this.stringBraces--;
					}
				}
			}
		}



		if (this.s[0] === "'") {
			i = 1;
			while (this.s.length > i) {
				if (this.s[i] === "'") {
					this.addToken('STRING', this.joinStrings(this.s.substr(0, i + 1)));
					return i + 1;
				}
				else {
					if (this.s[i] === '\\') {
						i++;
					}
					else {
						if (this.s[i] === '\#') {
							this.addToken('STRING', this.joinStrings(this.s.substr(0, i)) + "'");
							this.addToken('+');
							Lexer.prototype.addToken.call(this, '(');

							if (this.s[i + 1] === '{') {
								this.addToStack(MetabLexer.STATES.STRING_IN);
								return i + 2;
							}
							else {
								this.addToStack(MetabLexer.STATES.STRING);
								return i + 1;
							}
						}
					}
				}

				i++;
			}

			return 0;

		}
		else {
			if (this.s[0] === '"') {
				i = 1;
				while (this.s.length > i) {
					if (this.s[i] === '"') {
						this.addToken('STRING', this.joinStrings(this.s.substr(0, i + 1)));
						return i + 1;
					}
					else {
						if (this.s[i] === '\\') {
							i++;
						}
						else {
							if (this.s[i] === '\#') {
								this.addToken('STRING', this.joinStrings(this.s.substr(0, i)) + '"');
								this.addToken('+');
								Lexer.prototype.addToken.call(this, '(');

								if (this.s[i + 1] === '{') {
									this.addToStack(MetabLexer.STATES.DOUBLE_STRING_IN);
									return i + 2;
								}
								else {
									this.addToStack(MetabLexer.STATES.DOUBLE_STRING);
									return i + 1;
								}
							}
						}
					}

					i++;
				}

				return 0;
			}
		}

		return 0;
	}

	comments() {
		var r,i;
		r = this.parseExp(this.s, "^\#\#\#([^\#][\\s\\S]*?)(?:\#\#\#[^\\n\\S]*|\#\#\#$)");
		if (r !== null) {
			if (this.tokens.length === 0 || ([
				'EOL',
				'MCOMMENT',
				'COMMENT',
				'INDENT'
			].includes(this.lastTokenType))) {
				this.addToken('MCOMMENT', r);
			}
			return r.length;
		}

		if (this.s[0] === '\#') {
			i = 1;
			while (this.s[i] !== '\n' && this.s.length > i) i++
			if (this.tokens.length === 0 || ([
				'EOL',
				'MCOMMENT',
				'COMMENT',
				'INDENT'
			].includes(this.lastTokenType))) {
				this.addToken('COMMENT', this.s.substr(0, i));
			}
			return i;
		}

		return 0;
	}



	joinStrings(s) {
		var r;
		while (r = s.match(/\n[\t]*/)) s = s.replace(r[0], ' ')
		return s;
	}

	Return() {
		var r;
		r = this.parseOne(this.s, MetabLexer.RESERVED_RETURN);
		if (r !== null) {
			if (!(this.testExp(r, '^[a-zA-Z0-9_]+') && ((r.length < this.s.length && this.testExp(this.s[r.length], '^[a-zA-Z0-9_]+')) || this.lastTokenType === '.'))) {
				this.addToken('RETURN', r);

				return r.length;
			}
		}
		return 0;
	}

	methodDefine() {
		return this.addTokenOne(this.s, '->', [
			'--->',
			'-->',
			'->',
			'=>'
		]);
	}

	regularExpression() {
		var r,rp;
		r = this.parseExp(this.s, '^\\/(?!\\/)((?:[^[\\/\\n\\\\]|\\\\[^\\n]|\\[(?:\\\\[^\\n]|[^\\]\\n\\\\])*\\])*)(\\/)?');
		if (r !== null) {
			if (r.indexOf('\n') !== -1  || r[r.length - 1] !== '/' || r[r.length - 2] === ' ' || r[1] === ' ' || r.indexOf('/= ') === 0) {
				return 0;
			}

			rp = this.s.substr([
				r.length
			]).match(/^[gmi]{1,3}/);
			if (rp !== null) {
				r += rp;
			}

			this.addToken('REGEXP', r);

			return r.length;
		}
		return 0;
	}

	number() {
		return this.addTokenExp(this.s, 'NUMBER', '^(Infinity|(0x[0-9a-fA-F]+)|(0o[0-7]+)|(0b[0-1]+)|(0B[0-1]+)|((([0-9]+(\\.[0-9]+)*)|((\\.[0-9]+)+))([eE]+(-)*[0-9]+)*))');
	}

	comma() {
		return this.addTokenChar(this.s, ',');
	}

	groups() {
		if (this.s[0] === '(') {

			this.addToken('(', '(');

			return 1;
		}
		else {
			if (this.s[0] === ')') {

				this.addToken(')');

				return 1;
			}
		}
		return 0;
	}

	assignament() {
		var r;
		r = this.parseOne(this.s, MetabLexer.ASSIGNAMENTS);
		if (r !== null) {
			this.addToken((r === '='? '=' : 'ASSIGN_OP'), r);

			return r.length;
		}
		return 0;
	}

	If() {
		var r;
		r = this.parseOne(this.s, [
			'if',
			'unless'
		]);
		if (r !== null) {

			this.addToken('IF', r);
			return r.length;
		}
		return 0;
	}

	reserved() {
		var r;
		r = this.parseOne(this.s, MetabLexer.RESERVED_WORDS);
		if (r !== null) {
			if (!(this.testExp(r, '^[a-zA-Z0-9_]+') && ((r.length < this.s.length && this.testExp(this.s[r.length], '^[a-zA-Z0-9_]+')) || this.lastTokenType === '.'))) {
				this.addToken(r.toUpperCase(), r);

				return r.length;
			}
		}
		return 0;
	}

	incDecOperator() {
		return this.addTokenOne(this.s, '+-', MetabLexer.INCRE_DECRE_OPERATORS);
	}

	arithmeticOperator() {
		var r;
		r = this.parseOne(this.s, MetabLexer.ARITHMETIC_OPERATORS);
		if (r !== null) {
			this.addToken((r === '+' || r === '-'? r : 'ARITHMETIC'), r);

			return r.length;
		}
		return 0;
	}

	arithmeticPrecOperator() {
		return this.addTokenOne(this.s, 'ARITHMETIC_PREC', MetabLexer.ARITHMETIC_PREC_OPERATORS);
	}

	logicalOperator() {
		var r;
		r = this.parseOne(this.s, MetabLexer.LOGICAL_OPERATORS);
		if (r !== null) {
			if (!(this.testExp(r, '^[a-zA-Z0-9_]+') && ((r.length < this.s.length && this.testExp(this.s[r.length], '^[a-zA-Z0-9_]+')) || this.lastTokenType === '.'))) {
				this.addToken('LOGICAL', (r === 'and'? '&&' : (r === 'or'? '||' : r)));

				return r.length;
			}
		}
		return 0;
	}

	compareOperator() {
		var r;
		r = this.parseOne(this.s, MetabLexer.COMPARE_OPERATORS);
		if (r !== null) {
			if ((r[0] === '<' || r[0] === '>') && (this.parseOne(this.s, MetabLexer.ASSIGNAMENTS) || this.parseOne(this.s, MetabLexer.BINARY_OPERATORS))) {
				return 0;
			}
			if (!(this.testExp(r, '^[a-zA-Z0-9_]+') && ((r.length < this.s.length && this.testExp(this.s[r.length], '^[a-zA-Z0-9_]+')) || this.lastTokenType === '.'))) {
				this.addToken('COMPARE', (r === 'is'? '===' : (r === 'isnt'? '!==' : r)));

				return r.length;
			}
		}
		return 0;
	}

	binaryOperator() {
		return this.addTokenOne(this.s, 'BINARY_OP', MetabLexer.BINARY_OPERATORS);
	}

	booleans() {
		var r;
		r = this.parseOne(this.s, MetabLexer.RESERVED_BOOL);
		if (r !== null) {
			if (!(this.testExp(r, '^[a-zA-Z0-9_]+') && ((r.length < this.s.length && this.testExp(this.s[r.length], '^[a-zA-Z0-9_]+')) || this.lastTokenType === '.'))) {
				this.addToken('BOOLEAN', r);

				return r.length;
			}
		}
		return 0;
	}

	tag() {
		return this.addTokenExp(this.s, 'TAG', '^[$a-zA-Z_]+[$a-zA-Z0-9_]*');
	}

	Await() {
		if (this.s[0] === '@') {
			this.addToken('AWAIT', '@');

			return 1;
		}
		return 0;
	}

	indexes(tokens) {
		if ([
			'[',
			']',
			'.'
		].includes(this.s[0])) {
			this.addToken(this.s[0]);
			return 1;
		}
		return 0;
	}

	prototype() {
		if (this.s[0] === ':' && this.s[1] === ':') {
			this.addToken('.');
			this.addToken('TAG', 'prototype');
			return 2;
		}

		this.addTokenWord(this.s, '::');
	}

	addToStack(state) {
		this.stack.push([
			state,
			this.tokens.length
		]);
		this.currentState = state;
	}

	get lastStackType() {
		if (this.stack.length > 0) {
			return this.stack[this.stack.length - 1][0];
		}
		return null;
	}

}
MetabLexer.STATES = {
	"CALLIN" : 0,
	"AUTO_CALLIN" : 1,
	"INDENT" : 2,
	"INLINE_INDENT" : 3,
	"BRACE" : 4,
	"SQUARE" : 5,
	"PAREN" : 6,
	"STRING" : 7,
	"DOUBLE_STRING" : 8,
	"STRING_IN" : 9,
	"DOUBLE_STRING_IN" : 10
};

MetabLexer.LINE_UNIONS = [
	'+',
	'-',
	'ARITHMETIC_PREC',
	'BINARY_OP',
	'LOGICAL'
];


MetabLexer.RESERVED_BOOL = [
	'true',
	'false',
	'yes',
	'no'
];
MetabLexer.RESERVED_RETURN = [
	'return',
	'<-'
];
MetabLexer.RESERVED_WORDS = [
	'null',
	'undefined',
	'this',
	'await',
	'let',
	'const',
	'new',
	'delete',
	'throw',
	'break',
	'continue',
	'debugger',
	'if',
	'else',
	'unless',
	'switch',
	'case',
	'for',
	'while',
	'try',
	'catch',
	'finally',
	'class',
	'super',
	'default',
	'do',
	'loop',
	'with',
	'import',
	'export',
	'let',
	'var',
	'static',
	'void',
	'NaN',
	'Infinity',
	'typeof',
	'instanceof',
	'in',
	'by',
	'enum',
	'public',
	'private',
	'protected',
	'get',
	'set',
	'not',
	'as',
	'hon',
	'from'
];

MetabLexer.ASSIGNAMENTS = [
	'=',
	'-=',
	'+=',
	'/=',
	'*=',
	'%=',
	'|=',
	'&=',
	'<<=',
	'>>>=',
	'>>=',
	'^=',
	'**='
];
MetabLexer.BINARY_OPERATORS = [
	'|',
	'&',
	'^',
	'>>>',
	'>>',
	'<<'
];
MetabLexer.LOGICAL_OPERATORS = [
	'&&',
	'||',
	'and',
	'or'
];
MetabLexer.COMPARE_OPERATORS = [
	'===',
	'!==',
	'==',
	'!=',
	'>=',
	'<=',
	'>',
	'<',
	'isnt',
	'is'
];
MetabLexer.ARITHMETIC_OPERATORS = [
	'+',
	'-'
];
MetabLexer.ARITHMETIC_PREC_OPERATORS = [
	'/',
	'**',
	'*',
	'%'
];
MetabLexer.INCRE_DECRE_OPERATORS = [
	'++',
	'--'
];

MetabLexer.POST_AUTO_CALLIN = [
	'TAG',
	'(',
	'[',
	'{',
	'NOT',
	'~',
	'->',
	'+-',
	'+',
	'-',
	'SUPER',
	'THIS',
	'AWAIT',
	'VOID',
	'NEW',
	'NAN',
	'INFINITY',
	'TYPEOF',
	'HON',
	'STRING',
	'REGEXP',
	'NUMBER',
	'BOOLEAN',
	'UNDEFINED',
	'NULL'
];
MetabLexer.PRE_AUTO_CALLIN = [
	'TAG',
	']',
	'SUPER'
];
MetabLexer.PRE_PRE_AUTO_CALLIN = [
	'HON',
	'ENUM'
];




class SourceMaps {
	constructor(...args) {



		this.mappings = null;
		this.needComma = null;
		if(!(this.constructor.prototype instanceof SourceMaps) && this.init)return this.init(...args);
	}


	startSourceMap() {


		this.mappings = '';
		this.needComma = false;
	}


	getSourceMap(sourceFile, sourceCode, finalFile) {
		return {
			"version" : 3,
			"sources" : [
				sourceFile
			],
			"names" : [],
			"mappings" : this.mappings,
			"file" : finalFile,
			"sourcesContent" : [
				sourceCode
			]
		};
	}


	processMappings(mappings) {
		var c,l,lastc,lastl;
		c = 0;
		l = 0;
		lastc = 0;
		lastl = 0;
		for (var map of mappings) {
			if (map.line > 0) {
				this.JumpLines(map.line);
				c = 0;
				l += map.line;
			}

			c += map.col || 0;



			this.addMapping(map.firstCol - lastc, map.firstLine - lastl, 0, c);

			lastc = map.firstCol;
			lastl = map.firstLine;

			c = 0;

			if (map.toLine > 0) {
				this.JumpLines(map.toLine);
				l += map.toLine;
			}
			else {
				c += map.toCol;
			}
		}
	}


	addMapping(fromColumn, fromLine, fromFile, toColumn) {
		if (this.needComma) {
			this.mappings += ',';
		}
		this.mappings += this.encodeVlq(toColumn) + this.encodeVlq(fromFile) + this.encodeVlq(fromLine) + this.encodeVlq(fromColumn);
		this.needComma = true;
	}

	JumpLines(count) {
		for (var i = 0 ; 0<count? i<count : i>count ; 0<count? i+= 1 : i-= 1 ) this.mappings += ';'
		this.needComma = false;
	}

	encodeVlq(value) {
		var answer,signBit,valueToEncode,nextChunk;
		answer = '';

		signBit = value < 0? 1 : 0;

		valueToEncode = (Math.abs(value) << 1) + signBit;

		while (valueToEncode || !answer ) {
			nextChunk = valueToEncode & 31;
			valueToEncode = valueToEncode >> 5;
			if (valueToEncode) {
				nextChunk |= 32;
			}
			answer += SourceMaps.VlqCodes[nextChunk];
		}

		return answer;
	}

	decodeVlq(values) {
		var res,len,shift,value,integer,hasContinuationBit,shouldNegate;
		res = [];
		len = values.length;
		shift = 0;
		value = 0;

		for (var i = 0 ; 0<len? i<len : i>len ; 0<len? i+= 1 : i-= 1 ) {
			integer = SourceMaps.VlqPositions[values[i]];

			hasContinuationBit = integer & 32;

			integer &= 31;
			value += integer << shift;

			if (hasContinuationBit) {
				shift += 5;
			}
			else {
				shouldNegate = value & 1;
				value >>= 1;

				res.push(shouldNegate? -value  : value);

				value = shift = 0;
			}
		}

		return res;
	}

	convertCodePosition(line, col) {
		var lines,colres,linres,maps,c,map;
		lines = this.mappings.split(';');

		colres = 0;
		linres = 0;
		var il=0
		for (var l of lines) {
			if (l.length > 0) {
				maps = l.split(',');
				c = 1;
				if (il > line) {
					return [
						linres + 1,
						colres + 1
					];
				}

				for (var m of maps) {
					map = this.decodeVlq(m);
					c += map[0];
					linres += map[2];
					colres += map[3];

					if (il === (line - 1)) {
						if (c === col) {
							return [
								linres + 1,
								colres + 1
							];
						}
						else {
							if (c > col) {
								return [
									linres + 1,
									colres + 1
								];
							}
						}
					}
				}
			}
			il++;
		}


		return [
			line,
			col
		];
	}

}
SourceMaps.VlqCodes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
SourceMaps.VlqPositions = {
	A : 0,
	B : 1,
	C : 2,
	D : 3,
	E : 4,
	F : 5,
	G : 6,
	H : 7,
	I : 8,
	J : 9,
	K : 10,
	L : 11,
	M : 12,
	N : 13,
	O : 14,
	P : 15,
	Q : 16,
	R : 17,
	S : 18,
	T : 19,
	U : 20,
	V : 21,
	W : 22,
	X : 23,
	Y : 24,
	Z : 25,
	a : 26,
	b : 27,
	c : 28,
	d : 29,
	e : 30,
	f : 31,
	g : 32,
	h : 33,
	i : 34,
	j : 35,
	k : 36,
	l : 37,
	m : 38,
	n : 39,
	o : 40,
	p : 41,
	q : 42,
	r : 43,
	s : 44,
	t : 45,
	u : 46,
	v : 47,
	w : 48,
	x : 49,
	y : 50,
	z : 51,
	0 : 52,
	1 : 53,
	2 : 54,
	3 : 55,
	4 : 56,
	5 : 57,
	6 : 58,
	7 : 59,
	8 : 60,
	9 : 61,
	'+' : 62,
	'/' : 63
};


lexer = new MetabLexer();
parser = new MetabParser();

class Metab {
	constructor(...args) {
		if(!(this.constructor.prototype instanceof Metab) && this.init)return this.init(...args);
	}
}
Metab.imports = {};
Metab.sourceMaps = {};
Metab.r = null;
Metab.isBrowser = (typeof window !== 'undefined' && window !== null);
Metab.isNode = (typeof global !== 'undefined' && global !== null) && module != null;

Metab.importFromFile =  (_from, file, options) => {
	return new Promise((cb, ce) => {
		var fromPath;

		fromPath = path.dirname(_from);
		Metab.importFile(fromPath, file, (finalFile, res) => {
			cb(res);
		}, ce, options);
	});
};

Metab.Import =  (file, cb, ce, options) => {
	if (!(options)) {
		options = Metab.defaultOptions();
	}
	Metab.importFile(null, file, (finalFile, res) => {
		cb(res);
	}, ce, options);
};

Metab.importFile =  (_from, file, cb, ce, options) => {
	if (!(options)) {
		options = Metab.defaultOptions();
	}
	Metab.resolve(_from, file, (finalFile) => {
		if (options.ast) {
			Metab.loadAndGetAST(finalFile, ((ast) => {
				cb(ast);
			}), ce, options);
		}
		else {
			if (options.cache && Metab.imports[finalFile] != null) {
				Metab.importFromCache(finalFile, cb, ce);
			}
			else {
				Metab.imports[finalFile] = {
					load : new Promise((cbp, cep) => {
						Metab.loadAndCompileFile(finalFile, ((code) => {
							var metabr,res;
							try {
								Metab.run(code, finalFile);

								metabr = Metab.r;
								if (typeof metabr  === 'function') {
									res = metabr();

									if (res instanceof Promise) {
										res.then((rr) => {
											res = Metab.findDefault(rr);
											cb(finalFile, res);
											cbp(res);
										}).catch((e) => {
											ce(e);
											return cep(e);
										});
									}
									else {
										res = Metab.findDefault(res);
										cb(finalFile, res);
										cbp(res);
									}
								}
								else {
									res = Metab.findDefault(metabr);
									cb(finalFile, res);
									cbp(res);
								}
							}
							catch(e) {
								ce(e);
								return cep(e);
							};
						}), ((err) => {
							ce(err);
							cep(err);
						}), options);
					})
				};
			}
		}
	}, (e) => {


		ce(e);
	});
};

Metab.importFileSync =  (_from, file, options) => {
	var finalFile;
	if (!(options)) {
		options = Metab.defaultOptions();
	}
	finalFile = Metab.resolveSync(_from, file);
	if (options.ast) {
		return Metab.loadAndGetASTSync(finalFile, options);
	}
	else {
		throw 'TODO: import sync';
	}
};


Metab.importFromCache =  (file, cb, ce) => {
	Metab.imports[file].load.then((rr) => {
		cb(file, rr);
	});
};

Metab.resolve =  (_from, file, cb, ce) => {
	var ext,f,__v;
	ext = path.extname(file);
	if (!([
		'.metab',
		'.mson'
	].includes(ext))) {
		f = path.resolve(((typeof _from !== 'undefined' && _from !== null) ? _from : ''), file + '.metab');
		Metab.fileExist(f, () => {
			cb(f);
		}, (e) => {
			f = path.resolve(((typeof _from !== 'undefined' && _from !== null) ? _from : ''), file + '.mson');
			Metab.fileExist(f, () => {
				cb(f);
			}, () => {
				ce(e);
			});
		});
	}
	else {
		f = path.resolve(((typeof _from !== 'undefined' && _from !== null) ? _from : ''), file);
		Metab.fileExist(f, () => {
			cb(path.resolve(f));
		}, ce);
	}
};

Metab.resolveSync =  (_from, file) => {
	var ext,f,__v;
	ext = path.extname(file);
	if (!([
		'.metab',
		'.mson'
	].includes(ext))) {
		f = path.resolve(((typeof _from !== 'undefined' && _from !== null) ? _from : ''), file + '.metab');

		if (Metab.fileExistSync(f)) {
			return f;
		}
		else {
			f = path.resolve(((typeof _from !== 'undefined' && _from !== null) ? _from : ''), file + '.mson');
			if (Metab.fileExistSync(f)) {
				return f;
			}
			else {
				throw 'cannot read ' + f;
			}
		}
	}
	else {
		f = path.resolve(((typeof _from !== 'undefined' && _from !== null) ? _from : ''), file);
		if (Metab.fileExistSync(f)) {
			return path.resolve(f);
		}
		else {
			throw 'cannot read ' + f;
		}
	}
};



Metab.getTokens =  (code, cb, ce) => {

	try {
		cb(lexer.parse(code));
	}
	catch(e) {
		ce("Lexer in " + path + ': ' + e.toString());
	};
};

Metab.getAST =  (code, path, cb, ce, options) => {
	var tokens,nodes;
	try {
		tokens = lexer.parse(code, options);
	}
	catch(e) {
		return ce('Lexer error: ' + Metab.getErrorString(code, path, e));
	};

	try {
		nodes = parser.parse(tokens);
		nodes.showComments = options.comments;

		nodes.ProcessAST(path, ((frome, filee, cbe, cee) => {
			Metab.onImportMetadata(frome, filee, cbe, cee, options);
		}), (() => {
			cb(nodes);
		}), (err) => {
			console.error(err);
		});
	}
	catch(e) {
		return ce('Parse error: ' + Metab.getErrorString(code, path, e));
	};
};

Metab.getASTSync =  (code, path, options) => {
	var tokens,nodes;
	try {
		tokens = lexer.parse(code, options);
	}
	catch(e) {
		throw 'Lexer error: ' + Metab.getErrorString(code, path, e);
	};

	try {
		parser.tokens = tokens;
		nodes = parser.parse(tokens);
		nodes.showComments = options.comments;

		nodes.ProcessASTSync(path, (frome, filee) => {
			Metab.onImportMetadataSync(frome, filee, options);
		});

		return nodes;
	}
	catch(e) {
		throw 'Parse error: ' + Metab.getErrorString(code, path, e);
	};
};

Metab.getErrorString =  (code, path, e) => {
	var info;
	info = Metab.getErrorInfo(e.toString());
	return info.error + '\n' + Metab.getCodeErrorLines(code, info.line, info.col) + '\t-> (' + (path) + ') ' + (info.line) + ':' + (info.col) + '';
};

Metab.getErrorInfo =  (e) => {
	var pos;
	pos = e.substr(0, e.indexOf(' ')).split(':');

	return {
		line : parseInt(pos[0]),
		col : parseInt(pos[1]),
		error : e.substr(e.indexOf(' ') + 1)
	};
};


Metab.compile =  (code, path, cb, ce, options) => {
	if (!(options)) {
		options = Metab.defaultOptions();
	}
	Metab.getAST(code, path, ((nodes) => {
		nodes.getCode(0, 0, path, ((codeJS) => {
			cb(Metab.addMappings(code, path, codeJS, nodes, options));
		}), ce);
	}), ce, options);
};

Metab.compileSync =  (code, path, options) => {
	var nodes,codeJS;
	if (!(options)) {
		options = Metab.defaultOptions();
	}
	nodes = Metab.getASTSync(code, path, options);
	codeJS = nodes.getCodeSync(0, 0, path);

	return Metab.addMappings(code, path, codeJS, nodes, options);
};

Metab.addMappings =  (code, path, codeJS, nodes, options) => {
	var maps,smaps,stringmap;
	maps = nodes.getMappings();
	if (options.inlineMaps || options.externalMaps) {
		smaps = new SourceMaps;
		smaps.startSourceMap();
		smaps.processMappings(maps);
		if (options.externalMaps) {
			Metab.sourceMaps[path] = smaps;
			codeJS += "\n//\# sourceURL=" + path;
		}
		else {
			stringmap = JSON.stringify(smaps.getSourceMap(path, code, path.substr(0, path.lastIndexOf('.metab')) + '.js'));
			codeJS += "\n//\# sourceMappingURL=data:application/json;base64," + (Metab.isBrowser? btoa(stringmap) : (Buffer.from(stringmap).toString('base64')));
		}
	}

	return codeJS;
};

Metab.onImportMetadata =  (_from, file, cb, ce, options) => {
	var fromPath;
	fromPath = path.dirname(_from);
	options.ast = true;
	Metab.importFile(fromPath, file, cb, ce, options);
};

Metab.onImportMetadataSync =  (_from, file, options) => {
	var fromPath;
	fromPath = path.dirname(_from);
	options.ast = true;
	Metab.importFileSync(fromPath, file, options);
};

Metab.run =  (code) => {
	Metab.r = null;
	eval(code);
};

Metab.compileAndRun =  (code, file) => {
	Metab.compile(code, 'inline.metab', (newCode) => {
		Metab.run(newCode, file);
	}, (e) => {
		console.error(e);
	});
};

Metab.fileExist =  (file, cb, ce) => {
	fs.stat(file, (err, stats) => {
		if (err) {
			ce(err);
		}
		else {
			if (stats.isFile()) {
				cb(true);
			}
			else {
				ce(file + ' isnt file');
			}
		}
	});
};

Metab.fileExistSync =  (file) => {
	var stats;
	try {
		stats = fs.statSync(file);
		return stats.isFile();
	}
	catch(err) {
		return false;
	};
};

Metab.loadAndCompileFile =  (file, cb, ce, options) => {
	fs.readFile(file, 'utf8', (err, code) => {
		if (err) {
			ce(err);
		}
		else {
			if (file.indexOf('.mson') !== -1 ) {
				code = Metab.completeMson(code);
			}

			Metab.compile(code, file, cb, ce, options);
		}
	});
};

Metab.loadAndCompileFileSync =  (file, options) => {
	var code;
	code = fs.readFileSync(file, 'utf8');

	if (file.indexOf('.mson') !== -1 ) {
		code = Metab.completeMson(code);
	}

	return Metab.compileSync(code, file, options);
};

Metab.loadAndGetAST =  (file, cb, ce, options) => {
	fs.readFile(file, 'utf8', (err, code) => {
		if (err) {
			ce(err);
		}
		else {
			if (file.indexOf('.mson') !== -1 ) {
				code = Metab.completeMson(code);
			}

			Metab.getAST(code, file, cb, ce, options);
		}
	});
};

Metab.loadAndGetASTSync =  (file, cb, ce, options) => {
	var code;
	code = fs.readFileSync(file, 'utf8');

	if (file.indexOf('.mson') !== -1 ) {
		code = Metab.completeMson(code);
	}

	return Metab.getASTSync(code, file, options);
};


Metab.findDefault =  (exports) => {
	var e;
	if (!((typeof exports !== 'undefined' && exports !== null))) {
		exports = {};
	}
	if (!(exports.default != null)) {
		for (var i in exports) {
			e = exports[i];
			exports.default = e;
			break;
		}
	}

	return exports;
};

Metab.completeMson =  (code) => {
	return 'export {\n\t' + code.replace(new RegExp('\n', "g"), '\n\t') + '\n}';
};

Metab.convertCodePosition =  (file, line, col) => {
	var smaps;
	smaps = Metab.sourceMaps[file];
	if (smaps) {
		return smaps.convertCodePosition(line, col);
	}

	return [
		line,
		col
	];
};

Metab.defaultOptions =  () => {
	if (Metab.isNode) {
		return {
			externalMaps : true,
			cache : true,
			comments : true
		};
	}
	else {
		return {
			inlineMaps : true,
			cache : true,
			comments : true
		};
	}
};

Metab.getErrorLines =  (file, line, col) => {
	var code;
	try {
		code = fs.readFileSync(file, 'utf8');
		return Metab.getCodeErrorLines(code, line, col);
	}
	catch(e) {

	};


	return '';
};

Metab.getCodeErrorLines =  (code, line, col) => {
	var res,i,l;
	res = '\n    ';

	i = 0;
	l = 1;

	try {
		while (l < (line - 2) && i < code.length) {
			if (code[i] === '\n') {
				l++;
			}
			i++;
		}

		while (l < (line + 2) && i < code.length) {
			res += code[i];
			if (code[i] === '\n') {
				l++;
				if (l === line) {
					res += '--> ';
				}
				else {
					res += '    ';
				}
			}
			i++;
		}

		if (res[res.length - 1] !== '\n') {
			res += '\n';
		}
		res += '\n';

	}
	catch(e) {

	};


	return res;
};



if (Metab.isBrowser) {
	window.Metab = Metab;
}
else {
	if (Metab.isNode) {
		fs = require('fs');
		path = require('path');


		module.exports = global.Metab = Metab;






		Error.prepareStackTrace = (error, trace) => {
			var res,firstFile,file,ext,line,col,loc,__v;
			res = error + '\n';

			try {
				firstFile = true;
				for (var tra of trace) {
					file = tra.isEval()? tra.getEvalOrigin() : tra.getFileName();

					if (!(file === 'native generator.js' || file === null)) {
						ext = path.extname(file);
						if (ext === '.metab') {
							[
								line,
								col
							] = Metab.convertCodePosition(file, tra.getLineNumber(), tra.getColumnNumber());
						}
						else {
							line = tra.getLineNumber();
							col = tra.getColumnNumber();
						}

						if (firstFile) {
							firstFile = false;
							res += Metab.getErrorLines(file, line, col);
						}

						if (tra.isConstructor()) {
							loc = "new " + (tra.getFunctionName()) + "";
						}
						else {
							loc = (((__v=tra.getTypeName()) != null)? __v : '') + '.' + tra.getFunctionName();
						}

						res += "\t-> " + (loc) + " (" + (file) + ") " + (line) + ":" + (col) + "\n";
					}
				}
			}
			catch(e) {
				console.error('Metab error: ');
				console.error(e);

				res += trace;
			};

			return res;
		};
	}
}

})(this);