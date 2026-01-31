import { z } from "zod";

export const EXTERNAL_APPS = [
	"finder",
	"cursor",
	"vscode",
	"vscode-insiders",
	"zed",
	"windsurf",
	"sublime",
	"xcode",
	"warp",
	"terminal",
	"iterm",
	"ghostty",
	"github-desktop",
	"trae",
	"intellij",
	"webstorm",
	"pycharm",
	"phpstorm",
	"rubymine",
	"goland",
	"clion",
	"rider",
	"datagrip",
	"appcode",
	"fleet",
	"rustrover",
] as const;

export const externalAppSchema = z.enum(EXTERNAL_APPS);
export type ExternalApp = z.infer<typeof externalAppSchema>;

export interface AppMeta {
	label: string;
	/** macOS application name used with `open -a` */
	macAppName: string;
}

export const APP_META: Record<ExternalApp, AppMeta> = {
	finder: { label: "Finder", macAppName: "Finder" },
	cursor: { label: "Cursor", macAppName: "Cursor" },
	vscode: { label: "VS Code", macAppName: "Visual Studio Code" },
	"vscode-insiders": {
		label: "VS Code Insiders",
		macAppName: "Visual Studio Code - Insiders",
	},
	zed: { label: "Zed", macAppName: "Zed" },
	windsurf: { label: "Windsurf", macAppName: "Windsurf" },
	sublime: { label: "Sublime Text", macAppName: "Sublime Text" },
	xcode: { label: "Xcode", macAppName: "Xcode" },
	warp: { label: "Warp", macAppName: "Warp" },
	terminal: { label: "Terminal", macAppName: "Terminal" },
	iterm: { label: "iTerm", macAppName: "iTerm" },
	ghostty: { label: "Ghostty", macAppName: "Ghostty" },
	"github-desktop": { label: "GitHub Desktop", macAppName: "GitHub Desktop" },
	trae: { label: "Trae", macAppName: "Trae" },
	intellij: { label: "IntelliJ IDEA", macAppName: "IntelliJ IDEA" },
	webstorm: { label: "WebStorm", macAppName: "WebStorm" },
	pycharm: { label: "PyCharm", macAppName: "PyCharm" },
	phpstorm: { label: "PhpStorm", macAppName: "PhpStorm" },
	rubymine: { label: "RubyMine", macAppName: "RubyMine" },
	goland: { label: "GoLand", macAppName: "GoLand" },
	clion: { label: "CLion", macAppName: "CLion" },
	rider: { label: "Rider", macAppName: "Rider" },
	datagrip: { label: "DataGrip", macAppName: "DataGrip" },
	appcode: { label: "AppCode", macAppName: "AppCode" },
	fleet: { label: "Fleet", macAppName: "Fleet" },
	rustrover: { label: "RustRover", macAppName: "RustRover" },
};
