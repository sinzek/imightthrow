/* eslint-disable curly */
import ts from "typescript";
import * as vscode from "vscode";

function isNodeAFunction(node: ts.Node) {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isArrowFunction(node) ||
		ts.isFunctionExpression(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node)
	);
}

function isNodeFunctionOrCall(node: ts.Node) {
	return isNodeAFunction(node) || ts.isCallExpression(node) || ts.isNewExpression(node);
}

function isKindaFunctionesque(decl: ts.Declaration) {
	return (
		ts.isFunctionDeclaration(decl) ||
		ts.isMethodDeclaration(decl) ||
		ts.isArrowFunction(decl) ||
		ts.isFunctionExpression(decl) ||
		ts.isConstructorDeclaration(decl)
	);
}

export function isValidHexColor(hex: string): boolean {
	return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: null;
}

export function containsThrow(node: ts.Node, checker?: ts.TypeChecker): boolean {
	let found = false;

	function recur(n: ts.Node, inTryCatch = false) {
		// ignore throws inside catch blocks (they're handled)
		if (ts.isCatchClause(n)) {
			ts.forEachChild(n, (child) => recur(child, true));
			return;
		}

		// only count throws not in try-catch
		if (ts.isThrowStatement(n) && !inTryCatch) {
			found = true;
			return;
		}

		// check for calls to functions that throw
		if (checker && (ts.isCallExpression(n) || ts.isNewExpression(n))) {
			const decl = getCalledFunctionDeclaration(n, checker);
			if (decl && isKindaFunctionesque(decl) && decl.body) {
				if (containsThrow(decl.body, checker)) {
					found = true;
					return;
				}
			}
		}

		ts.forEachChild(n, (child) => recur(child, inTryCatch));
	}

	recur(node);
	return found;
}

// resolve a call expression to its declaration
export function getCalledFunctionDeclaration(
	call: ts.CallExpression | ts.NewExpression,
	checker: ts.TypeChecker
): ts.Declaration | undefined {
	const symbol = checker.getSymbolAtLocation(call.expression);
	if (!symbol) return undefined;
	// for functions with multiple declarations (overloads), pick the implementation
	return symbol.valueDeclaration || symbol.declarations?.[0];
}

export function visitNode(
	node: ts.Node,
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker,
	functionNameRanges: vscode.Range[] = [],
	config: vscode.WorkspaceConfiguration
) {
	const showOnCalls = config.get<boolean>("showOnCalls", true);
	const showOnDeclarations = config.get<boolean>("showOnDeclarations", true);

	if (!showOnCalls && !showOnDeclarations) return;

	if (isNodeFunctionOrCall(node)) {
		let n: ts.Node | undefined;

		if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
			if (!showOnCalls) return;
			n = node.expression;
		} else {
			if (!showOnDeclarations) return;
			n = node.name;
		}

		if (!n) return;

		let mightThrow = false;

		// for function declarations/expressions, check body
		if (isNodeAFunction(node)) {
			if (node.body) {
				mightThrow = containsThrow(node.body);
			}
		}

		// for call expressions, resolve declaration and check body
		if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && checker) {
			const decl = getCalledFunctionDeclaration(node, checker);
			if (decl && isKindaFunctionesque(decl) && decl.body) {
				mightThrow = containsThrow(decl.body);
			} else {
				// if we can't resolve the declaration, conservatively assume it might throw
				const sourceFile = decl?.getSourceFile();
				if (sourceFile && !sourceFile.isDeclarationFile) {
					mightThrow = true;
				} else {
					mightThrow = false; // skip globals like console.log
				}
			}
		}

		if (mightThrow) {
			const start = n.getStart(sourceFile);
			const end = n.getEnd();
			const startPos = sourceFile.getLineAndCharacterOfPosition(start);
			const endPos = sourceFile.getLineAndCharacterOfPosition(end);
			const range = new vscode.Range(
				new vscode.Position(startPos.line, startPos.character),
				new vscode.Position(endPos.line, endPos.character)
			);
			functionNameRanges.push(range);
		}
	}

	ts.forEachChild(node, (child) => visitNode(child, sourceFile, checker, functionNameRanges, config));
}

export function isValidLanguage(languageId: string): boolean {
	const validLanguages = ["typescript", "typescriptreact", "javascript", "javascriptreact"];
	return validLanguages.includes(languageId);
}
