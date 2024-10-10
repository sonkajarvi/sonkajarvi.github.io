const QUERY_PARAM = "q";

let repository = new Repository();

window.addEventListener("load", () => {
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
