const path = require("path");

const APP_KEY = "12574478";
const BASE_URL = "https://acs-m.88cha.com/h5";
const COOKIE_FILE = path.join(__dirname, "..", ".cookie");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const CH_UA = '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"';

module.exports = { APP_KEY, BASE_URL, COOKIE_FILE, UA, CH_UA };
