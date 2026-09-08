const AUTHENTICATION_WELCOME_MESSAGE = `<:Heart:1541639571266080819> **Welcome to Delta.**

-# P.O. Box 20980 Department 980 Atlanta, GA 30320-2980.

> <:WingPinLogo:1540927847709802607> **You have officially** been **authenticated** in **Delta Air Lines.** We **encourage** you to **explore** our server, **interact** with others, **check out** our **onboard offerings,** and view our **Loyalty Program SkyMiles!**

-# Thank you for joining **Delta Air Lines, a Member of SkyTeam Alliance.**`;

function newsletterContent(value) {
  const content = value?.trim();
  if (!content) throw new Error('Newsletter content cannot be empty.');
  if (content.length > 2000) throw new Error('Newsletter content cannot exceed 2,000 characters.');
  return content;
}

module.exports = { AUTHENTICATION_WELCOME_MESSAGE, newsletterContent };
