/** Back/forward navigation asks every <Deferred> section to mount at once so the saved scroll position exists. */
export const MOUNT_ALL_EVENT = 'wy:mount-deferred';
let mountAll = false;
export const shouldMountAll = () => mountAll;
export const requestMountAll = () => {
  mountAll = true;
  window.dispatchEvent(new Event(MOUNT_ALL_EVENT));
  window.setTimeout(() => { mountAll = false; }, 3000);
};
