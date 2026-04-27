const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

/**
 * GET /packages
 * Returns the list of Android packages from .ignore/packageList.json
 */
router.get("/", (req, res) => {
    try {
        const platformsDir = path.join(__dirname, "../../.ignore/platforms");
        const allPackages = [];

        if (fs.existsSync(platformsDir)) {
            const files = fs.readdirSync(platformsDir);
            files.forEach(file => {
                if (file.endsWith(".json")) {
                    const filePath = path.join(platformsDir, file);
                    const data = fs.readFileSync(filePath, "utf8");
                    const json = JSON.parse(data);
                    if (Array.isArray(json)) {
                        allPackages.push(...json);
                    }
                }
            });
        }

        // Fallback or legacy support for the old file if it still exists
        const legacyPath = path.join(__dirname, "../../.ignore/packageList.json");
        if (allPackages.length === 0 && fs.existsSync(legacyPath)) {
            const data = fs.readFileSync(legacyPath, "utf8");
            const json = JSON.parse(data);
            return res.json(json);
        }

        res.json({ packages: allPackages });
    } catch (err) {
        console.error("Error reading package lists:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
