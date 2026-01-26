// Mock desktop notifications hook for desktop app

export function useDesktopNotifications() {
  return {
    showNotification: (_title: string, _body: string) => {
      // Desktop notification - TODO: implement real notifications
    },
    notifyAgentComplete: (_chatName: string) => {
      // Agent complete notification - TODO: implement real notifications
    },
    requestPermission: () => Promise.resolve('granted' as NotificationPermission),
  }
}
