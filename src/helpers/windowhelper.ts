import { Options, isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { showMenu } from "./contextMenu";

// Disable the right-click menu and text selection.
export function loadContextmenu() {
  if (window.location.hostname !== 'tauri.localhost') {
    return
  }
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault()
    showMenu({
      items: [
        {
          label: "Reload",
          disabled: false,
          event: () => {
            window.location.reload();
          },
        },
      ],
    })
  }, { capture: true })
}


export function pushNotification(options: string | Options) {
    isPermissionGranted().then((granted) => {
        if (!granted) {
            requestPermission().then((permission) => {
                if (permission !== 'granted') {
                    console.log("permission not granted");
                    return;
                }
                console.log("permission granted");
                sendNotification(options);
            });
            return;
        }
        console.log("permission granted");
        sendNotification(options);
    });
}


