# Traventure Website

A responsive browser-based conversion of the Traventure Android app concept from the supplied APPDEV MIDTERM PROJ.

## Run locally
1. Extract `traventure-website.zip`.
2. Open `index.html` in a modern browser.

For best results, use a small local web server (for example, VS Code Live Server) so all assets load consistently.

## Included
- Home landing page and destination category chips
- Search and category filtering for 35 destinations represented in the Android `HomeData.java`
- Destination detail popups
- Favorites, itinerary, memories, achievements, and profile pages
- Responsive desktop/tablet/mobile layout
- Original destination image assets copied from the Android project

## Notes
- User-created favorites, itinerary stops, memories, and display name are saved in browser `localStorage` on the current device.
- The map uses an OpenStreetMap embed and requires an internet connection.
- This is a front-end website prototype. It does not include a backend, account authentication, or live route planning.

## To Add
- Footer that includes: copyright, terms, contact information, etc.
- Make the whole destination cards in home clickable
- Location details that were present in the application.
- Sidebar
- 1 additional screen/page that shows the list of notes. Creating notes shall be done after pressing a button in the memories page
- Log-in card that will pop-up when the user try to create notes.memories, click the heart or set a location to favorite, make itinerary, change theme color.
 ----> Not logging in will only let the user see the locations and its details. Changing or adding things in the website will require an account. Since magiging online website ito, lahat ng gagawin ng isang user ay makikita ng iba unless gumawa sila ng account.
 ----> In this regard, we have three options: 
 (1) force the users to make an account;
 (2) At their forst time opening the site, we'll provide them a choice if they want to use the website casually(no account) or make it their planner(must make an account), or;
 (3) Set pop ups ONLY when the user tries to make changes in the website while they still don't have an account (e.g., bookmark/setting favorite, making an itinerary, changing the theme color, etc.)
- Feedback/Suggestion page
- "I know a place" page (name can still be changed)
----> Here is where users can suggest locations (pictures and details; exact location, entrance fee, etc.)here in Camarines Norte that is not present in the website.
- And if you see things that should be fixed please do what you can while still being similar to the application.
- I'll create some pixel art with an environmental theme
- There are still a lot of things to fix here, don't rely solely on this list.
