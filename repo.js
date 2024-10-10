class Repository {
    // VARIABLE                             SET BY
    // owner                                init
    // repo                                 init
    // avatar                               queryRepo

    // commits[{message, url}]              queryCommit
    // commitsTotal                         queryCommit
    // branches[name]                       queryBranch
    // branchesTotal                        queryBranch
    // tags[name]                           queryTags
    // tagsTotal                            queryTags

    // files[{name, isDir}]

    // description                          queryRepo
    // stars                                queryRepo
    // watching                             queryRepo
    // forks                                queryRepo

    constructor() {
        this.commits = new Array();
        this.branches = new Array();
        this.tags = new Array();
        this.files = new Array();
    }

    async fetchHelper(url) {
        return await fetch(url, {
            headers: {
                "X-GitHub-Api-Version": "2022-11-28"
            }
        })
    }

    // Request repository data from GitHub
    //
    // If successful, load data and display it
    // Otherwise, show alert
    //
    // NOTE: Makes 1 request
    async queryRepo(owner, repo) {
        const res = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}`);
        if (!res.ok)
            throw new Error(res.status);

        const json = await res.json();
        this.avatar = json.owner.avatar_url;
        this.description = json.description || "No description provided.";
        this.stars = json.stargazers_count;
        this.watching = json.subscribers_count;
        this.forks = json.forks;
        this.branches.push(json.default_branch);

        return res;
    }

    // Query the 5 most recent commits
    // and the total amount
    //
    // NOTE: Makes 2 requests
    async queryCommits(owner, repo) {
        const fivePerPage = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`);
        if (!fivePerPage.ok)
            throw new Error(fivePerPage.status);

        // Get the 5 most recent commits
        const commits = await fivePerPage.json();
        if (commits.length === 0) {
            this.commitsTotal = 0;
            return;
        }

        commits.map((e) => {
            this.commits.push({
                message: e.commit.message.substring(0, 100),
                url: e.html_url
            });
        })

        // Get total commits
        const onePerPage = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
        if (!onePerPage.ok)
            throw new Error(onePerPage.status);

        const link = await onePerPage.headers.get("link");
        const lastUrl = link.split(",")[1].split(";")[0].slice(2, -1);
        const lastPage = Number(lastUrl.split("=")[2]);
        this.commitsTotal = lastPage;
    }

    // Query the top 4 branches
    // and the total amount
    //
    // NOTE: Makes 2 requests
    async queryBranches(owner, repo) {
        const fourPerPage = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=4`);
        if (!fourPerPage.ok)
            throw new Error(fourPerPage.status);

        // Get the top 4 branches
        const branches = await fourPerPage.json();
        if (branches.length <= 1) {
            this.branchesTotal = branches.length;
            return;
        }

        branches.map((e) => {
            this.branches.push(e.name);
        });

        // Get total branches
        const onePerPage = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=1`);
        if (!onePerPage.ok)
            throw new Error(fourPerPage.status);

        const link = await onePerPage.headers.get("link");
        const lastUrl = link.split(",")[1].split(";")[0].slice(2, -1);
        const lastPage = Number(lastUrl.split("=")[2]);
        this.branchesTotal = lastPage;
    }

    // Query the top 5 tags
    // and the total amount
    //
    // NOTE: Makes 2 requests
    async queryTags(owner, repo) {
        const fivePerPage = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=5`);
        if (!fivePerPage.ok)
            throw new Error(fivePerPage.status);
        
        // Get the top 5 tags
        const tags = await fivePerPage.json();
        if (tags.length === 0) {
            this.tagsTotal = 0;
            return;
        }

        tags.map((e) => {
            this.tags.push(e.name);
        });

        // Get total tags
        const onePerPage = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`);
        if (!onePerPage.ok)
            throw new Error(fourPerPage.status);

        const link = await onePerPage.headers.get("link");
        const lastUrl = link.split(",")[1].split(";")[0].slice(2, -1);
        const lastPage = Number(lastUrl.split("=")[2]);
        this.tagsTotal = lastPage;
    }

    // Query root files and directories
    // 
    // NOTE: Makes 1 request
    async queryFiles(owner, repo) {
        const res = await this.fetchHelper(`https://api.github.com/repos/${owner}/${repo}/contents`);
        if (!res)
            throw new Error(res.status);

        const files = await res.json();
        if (files.length === 0)
            return;

        let tmp_dirs = new Array();
        let tmp_files = new Array();
        
        files.map((e) => {
            const isDir = e.type === "dir";
            if (isDir)
                tmp_dirs.push({ "name": e.name, "isDir": isDir});
            else
                tmp_files.push({ "name": e.name, "isDir": isDir});
        });

        this.files.push(...tmp_dirs);
        this.files.push(...tmp_files);
    }

    // NOTE: Makes 9 requests; 1 + 2 + 2 + 2 + 2
    async init(owner, repo) {
        const title = document.querySelector("#input-title");

        // Get commit data
        try {
            await this.queryRepo(owner, repo);
            console.log("query repo");
            await this.queryCommits(owner, repo);
            console.log("query commits");
            await this.queryBranches(owner, repo);
            console.log("query branhces");
            await this.queryTags(owner, repo);
            console.log("query tags");
            await this.queryFiles(owner, repo);
            console.log("query files");
        } catch (e) {
            alert(`Failed to query repository (${e})`);
            title.innerHTML = "Search for a repository..."
            return;
        }

        // Set last bits of data
        this.owner = owner;
        this.repo = repo;

        // Display data
        this.displayLeft();
        this.displayHeader();
        this.displayFiles();
        this.displayRight();

        title.innerHTML = "Search for a repository..."
    }

    // Populate left side with data
    displayLeft() {
        // Commits
        const commitsTitle = document.querySelector("#left-commits-title");
        commitsTitle.href = `https://www.github.com/${this.owner}/${this.repo}/commits`;

        const commitsTotal = document.querySelector("#left-commits-total");
        commitsTotal.innerHTML = this.commitsTotal;

        const commits = document.querySelector("#left-commits");
        for (const { message, url } of this.commits) {
            commits.innerHTML += `<li title="View on GitHub"><a class="link" href="${url}">${message}</a></li>`;
        }

        // Branches
        const branchesTotal = document.querySelector("#left-branches-total");
        branchesTotal.innerHTML = this.branchesTotal;

        const branches = document.querySelector("#left-branches");
        for (const name of this.branches) {
            const url = `https://www.github.com/${this.owner}/${this.repo}/tree/${name}`;
            branches.innerHTML += `<li title="View on GitHub"><a class="link" href="${url}">${name}</a></li>`;
        }

        // Tags
        const tagsTitle = document.querySelector("#left-tags-title");
        tagsTitle.href = `https://www.github.com/${this.owner}/${this.repo}/tags`;

        const tagsTotal = document.querySelector("#left-tags-total");
        tagsTotal.innerHTML = this.tagsTotal;

        const tags = document.querySelector("#left-tags");
        for (const name of this.tags) {
            const url = `https://www.github.com/${this.owner}/${this.repo}/releases/tag/${name}`;
            tags.innerHTML += `<li title="View on GitHub"><a class="link" href="${url}">${name}</a></li>`;
        }
    }

    // Populate header with data
    displayHeader() {
        const owner = document.querySelector("#mid-owner");
        owner.href = `https://www.github.com/${this.owner}`;
        owner.innerHTML = `${this.owner}`;

        const repo = document.querySelector("#mid-repo");
        repo.href = `https://www.github.com/${this.owner}/${this.repo}`;
        repo.innerHTML = `${this.repo}`;

        const avatar = document.querySelector("#mid-avatar");
        avatar.src = `${this.avatar}`;
    }

    // Populate files
    displayFiles() {
        const files = document.querySelector("#mid-files");

        for (const { name, isDir } of this.files) {
            const url = `https://www.github.com/${this.owner}/${this.repo}/tree/${this.branches.at(0)}/${name}`;
            files.innerHTML += `
                <tr class="mid-entry">
                    <td class="mid-name" title="View on GitHub"><a class="link ${(isDir && "dir") || ""}" href="${url}">${name + ((isDir && "/") || "")}</a></td>
                </tr>
            `;
        }
    }

    // Populate about section with data
    displayRight() {
        const desc = document.querySelector("#right-desc");
        desc.innerHTML = `${this.description}`;

        const stars = document.querySelector("#right-stars");
        stars.innerHTML = `${this.stars} <span class="left-amount">stars</span>`

        const watching = document.querySelector("#right-watching");
        watching.innerHTML = `${this.watching} <span class="left-amount">watching</span>`

        const forks = document.querySelector("#right-forks");
        forks.innerHTML = `${this.forks} <span class="left-amount">forks</span>`
    }
}
