/* eslint-disable curly */
import ts from "typescript";
import * as vscode from "vscode";
import { hexToRgb, isValidHexColor, isValidLanguage, visitNode } from "./utils";

let functionDecoration: vscode.TextEditorDecorationType | undefined;

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration("imightthrow");
	if (!config.get<boolean>("enable", true)) return;

	console.log("imightthrow is active!");

	const analyzeIfTS = (document: vscode.TextDocument) => {
		if (isValidLanguage(document.languageId)) analyzeDocument(document, config);
	};

	vscode.workspace.onDidOpenTextDocument(analyzeIfTS);
	vscode.workspace.onDidSaveTextDocument(analyzeIfTS);
	vscode.workspace.textDocuments.forEach(analyzeIfTS);

	let analysisTimeout: NodeJS.Timeout | undefined;
	vscode.workspace.onDidChangeTextDocument((event) => {
		if (!isValidLanguage(event.document.languageId)) return;
		if (analysisTimeout) clearTimeout(analysisTimeout);
		analysisTimeout = setTimeout(() => analyzeIfTS(event.document), 500);
	});

	const disposable = vscode.commands.registerCommand("imightthrow.helloWorld", () => {
		vscode.window.showInformationMessage("Hello World from iMightThrow!");
	});

	context.subscriptions.push(disposable);
}

function analyzeDocument(document: vscode.TextDocument, config: vscode.WorkspaceConfiguration) {
	const program = ts.createProgram([document.fileName], { allowJs: true });
	const checker = program.getTypeChecker();
	const source = program.getSourceFile(document.fileName);
	if (!source || source.isDeclarationFile) return;

	let functionNameRanges: vscode.Range[] = [];
	ts.forEachChild(source, (n) => visitNode(n, source, checker, functionNameRanges, config));

	const editor = vscode.window.visibleTextEditors.find((e) => e.document.fileName === document.fileName);

	const highlightColor = config.get<string>("highlightColor", "#ff8800");
	const decorationString = config.get<string>("decoration", "!");

	let color = highlightColor;

	if (!isValidHexColor(highlightColor)) color = "#ff8800";

	if (functionDecoration) {
		functionDecoration.dispose();
	}

	const rgbColor = hexToRgb(color);
	if (!rgbColor) return;

	functionDecoration = vscode.window.createTextEditorDecorationType({
		after: {
			contentText: decorationString, // visual indicator
			color: highlightColor,
			margin: "0 0 0 2px",
			backgroundColor: `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.2)`,
		},
	});

	if (editor) {
		editor.setDecorations(functionDecoration, functionNameRanges);
	}
}

// when extension is deactivated
export function deactivate() {
	if (functionDecoration) {
		functionDecoration.dispose();
	}
}
