import type { User } from '../types';

const USER_UPDATED_EVENT = 'app:user-updated';

type UserUpdatedDetail = {
  user: User;
};

export const emitUserUpdated = (user: User) => {
  window.dispatchEvent(
    new CustomEvent<UserUpdatedDetail>(USER_UPDATED_EVENT, {
      detail: { user },
    }),
  );
};

export const subscribeUserUpdated = (callback: (user: User) => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<UserUpdatedDetail>;
    if (customEvent.detail?.user) {
      callback(customEvent.detail.user);
    }
  };

  window.addEventListener(USER_UPDATED_EVENT, handler);
  return () => window.removeEventListener(USER_UPDATED_EVENT, handler);
};
