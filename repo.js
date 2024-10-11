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
    #path = new Path();
    #fileName = "";
    #fileContents = "";

    async #fetchHelper(url) {
        let headers = { "X-GitHub-Api-Version": "2022-11-28" };

        const token = localStorage.getItem("token");
        if (token)
            headers["Authorization"] = `Bearer ${token}`;

        return await fetch(url, { headers });
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
    async #queryFiles(owner, repo) {
        const res = await this.#fetchHelper(`https://api.github.com/repos/${owner}/${repo}/contents${this.#path.pwd()}`);
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
                tmp_dirs.push({ name: e.name, "isDir": isDir, size: e.size});
            else
                tmp_files.push({ name: e.name, "isDir": isDir, size: e.size});
        });

        this.#files.length = 0;

        // Add entry for previous directory if not in root directory
        if (!this.#path.isRoot())
            this.#files.push({ name: "..", "isDir": true });

        this.#files.push(...tmp_dirs);
        this.#files.push(...tmp_files);

        console.log("Query files:", this.#path.pwd());
    }

    // NOTE: Makes 9 requests; 1 + 2 + 2 + 2 + 2
    async init(owner, repo) {
        this.#owner = owner;
        this.#repo = repo;

        const title = document.querySelector("#input-title");

        // Get commit data
        try {
            this.#setFetching();

            await this.#queryRepo(owner, repo);
            await this.#queryCommits(owner, repo);
            await this.#queryBranches(owner, repo);
            await this.#queryTags(owner, repo);

            // Directory is "/" here
            await this.#queryFiles(owner, repo);
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

    // Query and set file contents
    //
    // NOTE: Makes 1 request
    async #queryFile(path) {
        this.#setFetching();

        const fullPath = this.#path.pwd() + path;
        const res = await this.#fetchHelper(`https://api.github.com/repos/${this.#owner}/${this.#repo}/contents${fullPath}`);
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

        const fileName = document.querySelector("#mid-file-name");
        fileName.scrollIntoView({ behavior: "smooth" });

      console.log("Query file:", fullPath);
    }

    // Query and update files
    //
    // NOTES: Makes 1 request
    async #changeDirectory(path) {
        try {
            this.#path.cd(path);
            this.#setFetching();
            await this.#queryFiles(this.#owner, this.#repo);
        } catch (e) {
            alert(`Failed to query repository (${e})`);
            this.#setIdle();
            return;
        }

        this.#setIdle();
        this.#displayFiles();
        this.#displayHeader();
    }

    // Populate left side with data
    #displayLeft() {
        // Commits
        const commitsTitle = document.querySelector("#left-commits-title");
        commitsTitle.href = `https://www.github.com/${this.#owner}/${this.#repo}/commits`;

        const commitsTotal = document.querySelector("#left-commits-total");
        commitsTotal.innerHTML = this.#commitsTotal;

        const commits = document.querySelector("#left-commits");
        this.#commits.forEach((e) => {
            commits.innerHTML += `<li title="View on GitHub"><a class="link" href="${e.url}">${e.message}</a></li>`;
        });

        // Branches
        const branchesTotal = document.querySelector("#left-branches-total");
        branchesTotal.innerHTML = this.#branchesTotal;

        const branches = document.querySelector("#left-branches");
        // for (const name of this.#branches) {
        this.#branches.forEach((e) => {
            const url = `https://www.github.com/${this.#owner}/${this.#repo}/tree/${e.name}`;
            branches.innerHTML += `<li title="View on GitHub"><a class="link" href="${e.url}">${e.name}</a></li>`;
        });

        // Tags
        const tagsTitle = document.querySelector("#left-tags-title");
        tagsTitle.href = `https://www.github.com/${this.#owner}/${this.#repo}/tags`;

        const tagsTotal = document.querySelector("#left-tags-total");
        tagsTotal.innerHTML = this.#tagsTotal;

        const tags = document.querySelector("#left-tags");
        this.#tags.forEach((e) => {
            const url = `https://www.github.com/${this.#owner}/${this.#repo}/releases/tag/${e.name}`;
            tags.innerHTML += `<li title="View on GitHub"><a class="link" href="${e.url}">${e.name}</a></li>`;
        });
    }

    // Populate header with data
    #displayHeader() {
        const avatar = document.querySelector("#mid-avatar");
        avatar.src = `${this.#avatar}`;

        const owner = document.querySelector("#mid-owner");
        owner.href = `https://www.github.com/${this.#owner}`;
        owner.innerHTML = `${this.#owner}`;

        const paths = this.#path.getPaths();

        const midPath = document.querySelector("#mid-path");
        midPath.innerHTML = `
            <span class="left-amount">/</span>
            <a class="link" data-depth="${paths.length}">${this.#repo}</a>
        `;
        paths.forEach((e, i) => {
            midPath.innerHTML += `
                <span class="left-amount">/</span>
                <a class="link" data-depth="${paths.length - 1 - i}">${e}</a>
            `;
        });

        const pathElems = document.querySelectorAll("#mid-path a");
        pathElems.forEach((e) => {
            e.addEventListener("click", async () => {
                // Bit hacky
                for (let i = 0; i < e.dataset.depth; i++)
                    await this.#changeDirectory("..");
            });
        });
    }

    // Populate files
    #displayFiles() {
        const files = document.querySelector("#mid-files");
        files.innerHTML = "";

        // https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
        const formatBytes = (bytes, decimals = 1) => {
            if (!+bytes) return '0 B'

            const k = 1000
            const dm = decimals < 0 ? 0 : decimals
            const sizes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
        }

        this.#files.forEach((e) => {
            files.innerHTML += `
                <tr class="mid-entry">
                    <td class="mid-name link ${(e.isDir && "dir") || ""}">${e.name + ((e.isDir && "/") || "")}</td>
                    <td class="mid-size" colspan="2">${(!e.isDir && formatBytes(e.size)) || ""}</td>
                </tr>
            `;
        });

        const entries = document.querySelectorAll(".mid-name");
        entries.forEach((e, i) => {
            e.addEventListener("click", async () => {
                const { name, isDir } = this.#files[i];
                if (isDir)
                    await this.#changeDirectory(name);
                else
                    await this.#queryFile(name, true);
            });
        });
    }

    #displayFile() {
        const fileName = document.querySelector("#mid-file-name span");
        fileName.innerHTML = this.#fileName;

        const fileContents = document.querySelector("#mid-file-contents");
        fileContents.innerText = this.#fileContents;
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
