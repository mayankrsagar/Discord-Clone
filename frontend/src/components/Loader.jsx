import { InfinitySpin } from "react-loader-spinner";

const Loader = () => {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900">
      <InfinitySpin
        visible={true}
        width="200"
        color="white"
        ariaLabel="infinity-spin-loading"
      />
    </div>
  );
};

export default Loader;
