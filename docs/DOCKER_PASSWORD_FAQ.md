# Docker Installation - Password Questions

## What Password Is Being Asked?

When installing Docker Desktop, you'll see a **"Password:"** prompt. This is your **macOS system password** - the same password you use to:
- Log into your Mac
- Install applications
- Make system changes

## You Do NOT Need

- ❌ Docker Hub account
- ❌ Docker login credentials
- ❌ Special Docker password
- ❌ New account creation

## Just Enter Your Mac Password

The installation script needs admin privileges to:
1. Install Docker Desktop application
2. Set up Docker daemon
3. Configure system permissions

**Simply type your Mac's login password and press Enter.**

(Note: Your password won't show on screen as you type - this is normal for security)

---

## Do I Need a Docker Hub Account?

**No!** Docker Hub is optional and only needed if you want to:
- Publish your own Docker images publicly
- Access private Docker images from Docker Hub

For Archon, you're just **running** Docker containers locally. No account needed.

---

## After Installation

Once Docker Desktop is installed:
1. ✅ It will appear in your Applications folder
2. ✅ A whale icon will appear in your menu bar
3. ✅ You can use Docker without any login
4. ✅ Archon will work immediately

---

## Common Questions

**Q: Will Docker ask for payment?**
No! Docker Desktop is free for:
- Personal use
- Small businesses
- Education
- Open source projects

**Q: Do I need to create an account later?**
No! You can use Docker Desktop completely offline without ever creating an account.

**Q: What if I forget to start Docker?**
The installation script automatically launches Docker Desktop for you.

**Q: Can I skip the account creation screen?**
Yes! If Docker Desktop shows an account creation screen on first launch, just close it or click "Skip" - you don't need it.

---

## Troubleshooting

**If password is rejected:**
- Make sure you're using your Mac's login password
- Check Caps Lock is off
- Try typing slowly and carefully
- If still failing, cancel and try `sudo ls` in Terminal first to verify your password

**If installation hangs:**
```bash
# Cancel with Ctrl+C
# Then manually install Docker Desktop
brew install --cask docker

# Launch Docker
open -a Docker

# Re-run the Archon script
./docs/archon-quick-start.sh
```

---

## Summary

**Just enter your Mac's password when prompted. That's it!**

No Docker account, no new passwords, no sign-ups needed.
