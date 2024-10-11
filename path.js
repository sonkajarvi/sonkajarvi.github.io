class Path {
    #paths = [];

    // Change directory relative to current directory
    //
    // Does nothing if path is .
    // Goes up one directory if path is ..
    cd(path) {
        if (path === ".")
            return;
        else if (path === "..") {
            this.#paths.pop();
            return;
        }

        this.#paths.push(path);
    }

    // Get current path as string
    pwd() {
        if (this.isRoot())
            return "/";

        return "/" + this.#paths.join("/").toString() + "/";
    }

    getPaths() {
        return this.#paths;
    }

    isRoot() {
        return this.#paths.length === 0;
    }
}
