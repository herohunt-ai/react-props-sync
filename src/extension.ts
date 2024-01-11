import * as vscode from "vscode";
import { addProps } from "./addProps";
import { syncProps } from "./syncProps";

export function activate(context: vscode.ExtensionContext) {
  function registerCommand(command: string, callback: (...args: any[]) => any) {
    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
  }

  registerCommand("simple-react-snippets.addProps", () => addProps(false));
  registerCommand("simple-react-snippets.addPropsWithChildren", () =>
    addProps(true)
  );

  let timeout: NodeJS.Timeout;
  vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (event.contentChanges.length === 0) return;

    // TODO fix debounce when typing inside props and moving outside in 500ms
    clearTimeout(timeout);
    timeout = setTimeout(() => syncProps(event), 500);
  });

  console.log("simple-react-snippets is now active!");
}

export function deactivate() {}
