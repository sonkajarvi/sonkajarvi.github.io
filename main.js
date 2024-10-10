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

    const title = document.querySelector("#input-title");
    title.innerHTML = `Fetching ${owner} / ${repo}...`;

    repository.init(owner, repo);

    window.setTimeout(() => {
        const header = document.querySelector("#header-title");
        header.innerHTML += " :)";
    }, 1000 * 10);
});
