import toast from "react-hot-toast";

export const showToast = {
  success: (msg: string) =>
    toast.success(msg, {
      style: {
        background: "#f0fdf4",
        color: "#166534",
        border: "1px solid #bbf7d0",
      },
    }),
  error: (msg: string) =>
    toast.error(msg, {
      style: {
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      },
    }),
  info: (msg: string) => toast.success(msg),
  processing: (msg: string) =>
    toast.loading(msg, {
      style: {
        background: "#fffbeb",
        color: "#92400e",
        border: "1px solid #fde68a",
      },
    }),
};

export { toast };
export default toast;
