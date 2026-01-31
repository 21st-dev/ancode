import type { ExternalApp } from "../../shared/external-apps"

// Editor icon imports
import cursorIcon from "@/assets/app-icons/cursor.svg"
import vscodeIcon from "@/assets/app-icons/vscode.svg"
import vscodeInsidersIcon from "@/assets/app-icons/vscode-insiders.svg"
import zedIcon from "@/assets/app-icons/zed.png"
import sublimeIcon from "@/assets/app-icons/sublime.svg"
import xcodeIcon from "@/assets/app-icons/xcode.svg"
import intellijIcon from "@/assets/app-icons/intellij.svg"
import webstormIcon from "@/assets/app-icons/webstorm.svg"
import pycharmIcon from "@/assets/app-icons/pycharm.svg"
import phpstormIcon from "@/assets/app-icons/phpstorm.svg"
import rubymineIcon from "@/assets/app-icons/rubymine.svg"
import golandIcon from "@/assets/app-icons/goland.svg"
import clionIcon from "@/assets/app-icons/clion.svg"
import riderIcon from "@/assets/app-icons/rider.svg"
import datagripIcon from "@/assets/app-icons/datagrip.svg"
import appcodeIcon from "@/assets/app-icons/appcode.svg"
import fleetIcon from "@/assets/app-icons/fleet.svg"
import rustroverIcon from "@/assets/app-icons/rustrover.svg"
import ghosttyIcon from "@/assets/app-icons/ghostty.svg"
import windsurfIcon from "@/assets/app-icons/windsurf.svg"
import traeIcon from "@/assets/app-icons/trae.svg"

export const EDITOR_ICONS: Partial<Record<ExternalApp, string>> = {
  cursor: cursorIcon,
  vscode: vscodeIcon,
  "vscode-insiders": vscodeInsidersIcon,
  zed: zedIcon,
  windsurf: windsurfIcon,
  sublime: sublimeIcon,
  xcode: xcodeIcon,
  trae: traeIcon,
  intellij: intellijIcon,
  webstorm: webstormIcon,
  pycharm: pycharmIcon,
  phpstorm: phpstormIcon,
  rubymine: rubymineIcon,
  goland: golandIcon,
  clion: clionIcon,
  rider: riderIcon,
  datagrip: datagripIcon,
  appcode: appcodeIcon,
  fleet: fleetIcon,
  rustrover: rustroverIcon,
  ghostty: ghosttyIcon,
}
