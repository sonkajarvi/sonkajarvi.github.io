const QUERY_PARAM = "q";

let repository = new Repository();

window.addEventListener("load", () => {
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
