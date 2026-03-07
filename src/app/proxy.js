let useLocalPath = false;

const LOCAL_PROXY = "http://localhost:8000";
const REMOTE_PROXY = "https://enum-backend.onrender.com"

let proxy = useLocalPath==true ? LOCAL_PROXY : REMOTE_PROXY;

export {proxy};
