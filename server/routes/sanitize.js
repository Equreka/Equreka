const sanitize = {
  search(string) {
    string = string
      .replace(/[\])}[{(]/gi, "")
      .replace(/[^\w\s]/gi, " ")
      .replace(/[^a-zA-Z]/gi, ".+")
      .replace(" ", ".+");
    return string;
  }
}

module.exports = sanitize;