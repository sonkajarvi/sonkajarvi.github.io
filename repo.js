class Repository {
    #owner = "";
    #repo = "";
    #avatar = "";

    #description = "";
    #stars = 0;
    #watching = 0;
    #forks = 0;

    #commits = [];
    #commitsTotal = 0;
    #branches = [];
    #branchesTotal = 0;
    #tags = [];
    #tagsTotal = 0;

    #files = [];
    #currentDirectory = "/";
    #fileName = "";
    #fileContents = "";

    async #fetchHelper(url) {
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
    async #queryRepo(owner, repo) {
        const res = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}`);
        if (!res.ok)
            throw new Error(res.status);

        const json = await res.json();
        this.#avatar = json.owner.avatar_url;
        this.#description = json.description || "No description provided.";
        this.#stars = json.stargazers_count;
        this.#watching = json.subscribers_count;
        this.#forks = json.forks;
        this.#branches.push(json.default_branch);

        console.log("Query repository:", owner, "/", repo);
    }

    // Query the 5 most recent commits
    // and the total amount
    //
    // NOTE: Makes 2 requests
    async #queryCommits(owner, repo) {
        const fivePerPage = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`);
        if (!fivePerPage.ok)
            throw new Error(fivePerPage.status);

        // Get the 5 most recent commits
        const commits = await fivePerPage.json();
        if (commits.length === 0) {
            this.#commitsTotal = 0;
            return;
        }

        commits.map((e) => {
            this.#commits.push({
                message: e.commit.message.substring(0, 100),
                url: e.html_url
            });
        })

        // Get total commits
        const onePerPage = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
        if (!onePerPage.ok)
            throw new Error(onePerPage.status);

        const link = await onePerPage.headers.get("link");
        const lastUrl = link.split(",")[1].split(";")[0].slice(2, -1);
        const lastPage = Number(lastUrl.split("=")[2]);
        this.#commitsTotal = lastPage;

        console.log("Query commits");
    }

    // Query the top 4 branches
    // and the total amount
    //
    // NOTE: Makes 2 requests
    async #queryBranches(owner, repo) {
        const fourPerPage = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=4`);
        if (!fourPerPage.ok)
            throw new Error(fourPerPage.status);

        // Get the top 4 branches
        const branches = await fourPerPage.json();
        if (branches.length <= 1) {
            this.#branchesTotal = branches.length;
            return;
        }

        branches.map((e) => {
            this.#branches.push(e.name);
        });

        // Get total branches
        const onePerPage = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=1`);
        if (!onePerPage.ok)
            throw new Error(fourPerPage.status);

        const link = await onePerPage.headers.get("link");
        const lastUrl = link.split(",")[1].split(";")[0].slice(2, -1);
        const lastPage = Number(lastUrl.split("=")[2]);
        this.#branchesTotal = lastPage;

        console.log("Query branches")
    }

    // Query the top 5 tags
    // and the total amount
    //
    // NOTE: Makes 2 requests
    async #queryTags(owner, repo) {
        const fivePerPage = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=5`);
        if (!fivePerPage.ok)
            throw new Error(fivePerPage.status);
        
        // Get the top 5 tags
        const tags = await fivePerPage.json();
        if (tags.length === 0) {
            this.#tagsTotal = 0;
            return;
        }

        tags.map((e) => {
            this.#tags.push(e.name);
        });

        // Get total tags
        const onePerPage = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`);
        if (!onePerPage.ok)
            throw new Error(fourPerPage.status);

        const link = await onePerPage.headers.get("link");
        const lastUrl = link.split(",")[1].split(";")[0].slice(2, -1);
        const lastPage = Number(lastUrl.split("=")[2]);
        this.#tagsTotal = lastPage;

        console.log("Query tags");
    }

    // Query root files and directories
    // 
    // NOTE: Makes 1 request
    async #queryFiles(owner, repo, path) {
        const res = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/contents${path}`);
        if (!res)
            throw new Error(res.status);

        const files = await res.json();
        if (files.length === 0)
            return;

        let tmp_dirs = [];
        let tmp_files = [];
        
        files.map((e) => {
            const isDir = e.type === "dir";
            if (isDir)
                tmp_dirs.push({ name: e.name, "isDir": isDir});
            else
                tmp_files.push({ name: e.name, "isDir": isDir});
        });

        this.#files.length = 0;

        if (path !== "/")
            this.#files.push({ name: "..", "isDir": true });

        this.#files.push(...tmp_dirs);
        this.#files.push(...tmp_files);
        this.currentDirectory = path;

        console.log("Query files:", path);
    }

    // NOTE: Makes 9 requests; 1 + 2 + 2 + 2 + 2
    async init(owner, repo) {
        this.#owner = owner;
        this.#repo = repo;
        this.#currentDirectory = "/";

        const title = document.querySelector("#input-title");

        // Get commit data
        try {
            this.#setFetching();

            await this.#queryRepo(owner, repo);
            await this.#queryCommits(owner, repo);
            await this.#queryBranches(owner, repo);
            await this.#queryTags(owner, repo);
            await this.#queryFiles(owner, repo, this.#currentDirectory);
        } catch (e) {
            alert(`Failed to query repository (${e})`);
            this.#setIdle();
            return;
        }

        // Display data
        this.#displayLeft();
        this.#displayHeader();
        this.#displayFiles();
        this.#displayRight();

        this.#setIdle();
    }

    #setFetching() {
        const title = document.querySelector("#input-title");
        title.innerHTML = `Fetching ${this.#owner} / ${this.#repo}...`;
    }

    #setIdle() {
        const title = document.querySelector("#input-title");
        title.innerHTML = "Search for a repository..."
    }

    #getParentDirectory(path) {
        return path.split("/").slice(0, -2).join("/") + "/";
    }

    // Query and set file contents
    //
    // NOTE: Makes 1 request
    async #queryFile(path, scroll) {
        this.#setFetching();

        const res = await this.#fetchHelper(`https://api.github.com/repos/${this.#owner}/${this.#repo}/contents${path}`);
        if (!res.ok) {
            alert(`Failed to query repository (${e})`);
            this.#setIdle();
            return;
        }

        const json = await res.json();
        this.#fileName = json.name;
        this.#fileContents = atob(json.content);

        this.#setIdle();
        this.#displayFile();

        if (scroll) {
            const fileName = document.querySelector("#mid-file-name");
            fileName.scrollIntoView({behavior: 'smooth'});
        }
    }

    // Query and update files
    //
    // NOTES: Makes 1 request
    async #changeDirectory(path) {
        try {
            let dir = `${this.#currentDirectory}${path}/`;
            if (path === "..")
                dir = this.#getParentDirectory(this.#currentDirectory);

            this.#setFetching();
            await this.#queryFiles(this.#owner, this.#repo, dir);
            this.#currentDirectory = dir;
        } catch (e) {
            alert(`Failed to query repository (${e})`);
            this.#setIdle();
            return;
        }

        this.#setIdle();
        this.#displayFiles();
    }

    // Change directory or show file
    //
    // NOTE: Makes 1 request
    #fileInteraction(path, isDir) {
        if (isDir)
            this.#changeDirectory(path);
        else
            this.#queryFile(`${this.#currentDirectory}${path}`, true);
    }

    // Populate left side with data
    #displayLeft() {
        // Commits
        const commitsTitle = document.querySelector("#left-commits-title");
        commitsTitle.href = `https://www.github.com/${this.#owner}/${this.#repo}/commits`;

        const commitsTotal = document.querySelector("#left-commits-total");
        commitsTotal.innerHTML = this.#commitsTotal;

        const commits = document.querySelector("#left-commits");
        for (const { message, url } of this.#commits) {
            commits.innerHTML += `<li title="View on GitHub"><a class="link" href="${url}">${message}</a></li>`;
        }

        // Branches
        const branchesTotal = document.querySelector("#left-branches-total");
        branchesTotal.innerHTML = this.#branchesTotal;

        const branches = document.querySelector("#left-branches");
        for (const name of this.#branches) {
            const url = `https://www.github.com/${this.#owner}/${this.#repo}/tree/${name}`;
            branches.innerHTML += `<li title="View on GitHub"><a class="link" href="${url}">${name}</a></li>`;
        }

        // Tags
        const tagsTitle = document.querySelector("#left-tags-title");
        tagsTitle.href = `https://www.github.com/${this.#owner}/${this.#repo}/tags`;

        const tagsTotal = document.querySelector("#left-tags-total");
        tagsTotal.innerHTML = this.#tagsTotal;

        const tags = document.querySelector("#left-tags");
        for (const name of this.#tags) {
            const url = `https://www.github.com/${this.#owner}/${this.#repo}/releases/tag/${name}`;
            tags.innerHTML += `<li title="View on GitHub"><a class="link" href="${url}">${name}</a></li>`;
        }
    }

    // Populate header with data
    #displayHeader() {
        const owner = document.querySelector("#mid-owner");
        owner.href = `https://www.github.com/${this.#owner}`;
        owner.innerHTML = `${this.#owner}`;

        const repo = document.querySelector("#mid-repo");
        repo.href = `https://www.github.com/${this.#owner}/${this.#repo}`;
        repo.innerHTML = `${this.#repo}`;

        const avatar = document.querySelector("#mid-avatar");
        avatar.src = `${this.#avatar}`;
    }

    // Populate files
    #displayFiles() {
        const files = document.querySelector("#mid-files");
        files.innerHTML = "";

        files.innerHTML = "";

        for (const { name, isDir } of this.#files) {
            const url = `https://www.github.com/${this.#owner}/${this.#repo}/tree/${this.#branches.at(0)}/${name}`;
            files.innerHTML += `
                <tr class="mid-entry">
                    <td class="mid-name link ${(isDir && "dir") || ""}">${name + ((isDir && "/") || "")}</td>
                </tr>
            `;
        }

        const entries = document.querySelectorAll(".mid-name");
        entries.forEach((e, i) => {
            e.addEventListener("click", async () => {
                const { name, isDir } = this.#files[i];
                await this.#fileInteraction(name, isDir);
            });
        });
    }

    #displayFile() {
        const fileName = document.querySelector("#mid-file-name");
        fileName.innerHTML = this.#fileName;

        const fileContents = document.querySelector("#mid-file-contents");
        fileContents.innerHTML = this.#fileContents;
    }

    // Populate about section with data
    #displayRight() {
        const desc = document.querySelector("#right-desc");
        desc.innerHTML = `${this.#description}`;

        const stars = document.querySelector("#right-stars");
        stars.innerHTML = `${this.#stars} <span class="left-amount">stars</span>`

        const watching = document.querySelector("#right-watching");
        watching.innerHTML = `${this.#watching} <span class="left-amount">watching</span>`

        const forks = document.querySelector("#right-forks");
        forks.innerHTML = `${this.#forks} <span class="left-amount">forks</span>`
    }
}
