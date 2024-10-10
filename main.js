const QUERY_PARAM = "q";

let repository = new Repository();

const REPOS = [
    "torvalds/linux",
    "git/git",
    "llvm/llvm-project",
    "facebook/react",
    "microsoft/vscode",

    "chromium/chromium",
    "v8/v8",
    "webkit/webkit",
    "sveltejs/svelte",
    "vuejs/vue",

    "twbs/bootstrap",
    "flutter/flutter",
    "vercel/next.js",
    "golang/go",
    "electron/electron",

    "nodejs/node",
    "rust-lang/rust",
    "neovim/neovim",
    "godotengine/godot",
    "ladybirdbrowser/ladybird"
];

window.addEventListener("load", () => {
    // Change placeholder every so often
    const input = document.querySelector("#input-field");
    let prev;

    window.setInterval(() => {
        let next;

        // No back to back
        do {
            next = REPOS[Math.floor(Math.random() * REPOS.length)];
        } while (prev === next);

        input.placeholder = next;
        prev = next;
    }, 2000);

    const backToTop = document.querySelector("#mid-file-name a");
    const header = document.querySelector("#header");
    backToTop.addEventListener("click", () => {
        header.scrollIntoView({ behavior: "smooth" });
    });

    const tokenSave = document.querySelector("#input-token-save");
    tokenSave.addEventListener("click", () => {
        const token = prompt("Save token in LocalStorage");
        localStorage.setItem("token", token);
    });

    const tokenClear = document.querySelector("#input-token-clear");
    tokenClear.addEventListener("click", () => {
        localStorage.removeItem("token");
        alert("Token removed from LocalStorage");
    });

    const urlParams = new URLSearchParams(window.location.search);

    if (!urlParams.has(QUERY_PARAM)) {
        console.log("no query");
        return;
    }

    const [ owner, repo ] = urlParams.get(QUERY_PARAM).split("/");
    if (!owner || !repo) {
        alert("Invalid input, format for query is <owner>/<repository>");
        return;
    }

    repository.init(owner, repo);

    window.setTimeout(() => {
        const header = document.querySelector("#header-title");
        header.innerHTML = "GitHub repository viewer :)";
    }, 1000 * 10);

    window.setTimeout(() => {
        const header = document.querySelector("#header-title");
        header.innerHTML = "GitHub repository viewer :D";
    }, 1000 * 20);
});
