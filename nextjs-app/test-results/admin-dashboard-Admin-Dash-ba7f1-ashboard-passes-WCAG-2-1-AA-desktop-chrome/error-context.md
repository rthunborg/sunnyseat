# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Hoppa till innehåll" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e5]:
    - heading "SunnySeat Admin" [level=1] [ref=e6]
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Användarnamn
        - textbox "Användarnamn" [ref=e10]: admin
      - generic [ref=e11]:
        - generic [ref=e12]: Lösenord
        - textbox "Lösenord" [ref=e13]: test-password
      - alert [ref=e14]: Invalid username or password
      - button "Logga in" [ref=e15]
  - contentinfo [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]:
        - paragraph [ref=e19]: © 2026 SunnySeat
        - paragraph [ref=e20]: "Data: Met.no, Lantmäteriet, OSM"
      - generic [ref=e21]:
        - link "Om SunnySeat" [ref=e22] [cursor=pointer]:
          - /url: /about
        - button "Byt språk" [ref=e23]: EN
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```