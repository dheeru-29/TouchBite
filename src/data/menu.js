const image = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`;
const burgerOptions = [
  { id: 'cheese', name: 'Aged cheese', price: 30 }, { id: 'sauce', name: 'Signature sauce', price: 15 },
  { id: 'lettuce', name: 'Fresh lettuce', price: 10 }, { id: 'patty', name: 'Extra patty', price: 75 },
];
const chickenOptions = [
  { id: 'cheese', name: 'Aged cheese', price: 30 }, { id: 'spice', name: 'Spicy glaze', price: 15 },
  { id: 'lettuce', name: 'Fresh lettuce', price: 10 }, { id: 'fillet', name: 'Extra fillet', price: 70 },
];
const sideOptions = [{ id: 'dip', name: 'Smoky dip', price: 20 }, { id: 'cheese', name: 'Cheese dust', price: 20 }];
const drinkOptions = [{ id: 'ice', name: 'Extra ice', price: 0 }, { id: 'float', name: 'Vanilla float', price: 35 }];

export const menuItems = [
  ['smash-burger', 'Classic Smash Burger', 'Double-seared veggie patty, pickles and house sauce.', 179, 'Burgers', '1568901346375-23c9450c58cd', true, true, burgerOptions],
  ['fire-crunch', 'Fire Crunch Burger', 'Crisp spiced chicken, slaw and hot pepper mayo.', 219, 'Burgers', '1561758033-d89a9ad46330', true, false, chickenOptions],
  ['garden-stack', 'Garden Stack', 'Grilled corn patty, tomato, lettuce and herb mayo.', 189, 'Burgers', '1520072959219-c595dc870360', false, true, burgerOptions],
  ['smoky-bbq', 'Smoky BBQ Burger', 'Charred chicken with smoky barbecue glaze.', 239, 'Burgers', '1550547660-d9450f859349', false, false, chickenOptions],
  ['paneer-pop', 'Paneer Pop Burger', 'Crisp paneer patty with tangy mint spread.', 209, 'Burgers', '1586816001966-79b736744398', false, true, burgerOptions],
  ['big-bite', 'Big Bite Burger', 'Two chicken fillets, cheese, onions and pickles.', 279, 'Burgers', '1565299507177-b0ac66763828', true, false, chickenOptions],
  ['crisp-tenders', 'Golden Chicken Tenders', 'Five crunchy, hand-breaded chicken tenders.', 229, 'Chicken', '1562967914-608f82629710', true, false, chickenOptions],
  ['hot-wings', 'Blazing Wings', 'Six juicy wings in our bright chilli glaze.', 249, 'Chicken', '1527477396000-e27163b481c2', false, false, chickenOptions],
  ['grilled-chicken', 'Herb Grilled Chicken', 'Tender grilled chicken with lemon herb rub.', 239, 'Chicken', '1532550907401-a500c9a57435', false, false, chickenOptions],
  ['chicken-bites', 'Pepper Chicken Bites', 'Bite-size chicken with cracked pepper crust.', 199, 'Chicken', '1626645738196-c2a7c87a8f58', false, false, chickenOptions],
  ['spicy-strips', 'Spicy Chicken Strips', 'Three fiery strips with cooling ranch dip.', 189, 'Chicken', '1562967916-eb82221dfb36', false, false, chickenOptions],
  ['smash-meal', 'Classic Smash Meal', 'Classic Smash Burger, crisp fries and a drink.', 299, 'Meals', '1568901346375-23c9450c58cd', true, true, burgerOptions],
  ['crunch-meal', 'Fire Crunch Meal', 'Fire Crunch Burger, fries and a chilled drink.', 349, 'Meals', '1561758033-d89a9ad46330', true, false, chickenOptions],
  ['family-feast', 'TouchBite Family Feast', 'Four burgers, two sides and four refreshing drinks.', 899, 'Meals', '1555939594-58d7cb561ad1', true, false, burgerOptions],
  ['tender-meal', 'Tender Treat Meal', 'Three chicken tenders, fries, dip and a drink.', 319, 'Meals', '1562967914-608f82629710', false, false, chickenOptions],
  ['garden-meal', 'Garden Stack Meal', 'Garden Stack, fries and a drink of your choice.', 309, 'Meals', '1520072959219-c595dc870360', false, true, burgerOptions],
  ['party-box', 'Weekend Party Box', 'Eight chicken bites, four fries and four dips.', 659, 'Meals', '1562967914-608f82629710', false, false, chickenOptions],
  ['sea-salt-fries', 'Sea Salt Fries', 'Golden potato fries with a delicate sea salt finish.', 99, 'Fries & Sides', '1573080496219-bb080dd4f877', true, true, sideOptions],
  ['peri-fries', 'Peri Peri Fries', 'Crisp fries coated in lively peri peri spice.', 119, 'Fries & Sides', '1576107232684-1279f390859f', true, true, sideOptions],
  ['cheese-fries', 'Loaded Cheese Fries', 'Fries piled high with warm cheese sauce.', 149, 'Fries & Sides', '1585109649139-366815a0d713', true, true, sideOptions],
  ['onion-rings', 'Crispy Onion Rings', 'Eight light, crunchy rings with house dip.', 129, 'Fries & Sides', '1639024471283-03518883512d', false, true, sideOptions],
  ['corn-cup', 'Butter Corn Cup', 'Sweet corn, butter and a little paprika.', 89, 'Fries & Sides', '1603046891744-76e6300d1d8d', false, true, sideOptions],
  ['nuggets', 'Veggie Nuggets', 'Six golden vegetable bites with tomato dip.', 129, 'Fries & Sides', '1562967916-eb82221dfb36', false, true, sideOptions],
  ['cola', 'Sparkling Cola', 'Ice-cold house cola, served bubbly.', 69, 'Beverages', '1629203851122-3726ecdf080e', true, true, drinkOptions],
  ['lime-fizz', 'Lime Mint Fizz', 'Fresh lime and mint over crushed ice.', 89, 'Beverages', '1513558161293-cdaf765ed2fd', false, true, drinkOptions],
  ['mango-cooler', 'Mango Cooler', 'Sun-ripened mango drink, bright and smooth.', 99, 'Beverages', '1546173159-315724a31696', false, true, drinkOptions],
  ['cold-coffee', 'Cold Coffee', 'Creamy chilled coffee with a cocoa finish.', 119, 'Beverages', '1497935586351-b67a49e012bf', false, true, drinkOptions],
  ['berry-tea', 'Berry Iced Tea', 'Black tea, berry notes and a lemon lift.', 99, 'Beverages', '1556679343-c7306c1976bc', false, true, drinkOptions],
  ['vanilla-shake', 'Vanilla Cloud Shake', 'A thick vanilla shake crowned with cream.', 139, 'Beverages', '1572490122747-3968b75cc699', true, true, drinkOptions],
  ['choco-lava', 'Chocolate Lava Cup', 'Warm chocolate cake with a molten centre.', 129, 'Desserts', '1606313564200-e75d5e30476c', true, true, sideOptions],
  ['sundae', 'Caramel Sundae', 'Velvety vanilla soft serve and caramel drizzle.', 99, 'Desserts', '1563805042-7684c019e1cb', false, true, sideOptions],
  ['cookie', 'Chunky Choco Cookie', 'A soft, generous cookie loaded with chocolate.', 69, 'Desserts', '1499636136210-6f4ee915583e', false, true, sideOptions],
  ['brownie', 'Fudge Brownie', 'Dense dark chocolate brownie, baked in-house.', 109, 'Desserts', '1606312619070-d48b4c652a52', false, true, sideOptions],
  ['berry-cup', 'Berry Cheesecake Cup', 'Silky cheesecake with a bright berry compote.', 139, 'Desserts', '1565958011703-44f9829ba187', false, true, sideOptions],
  ['apple-pie', 'Cinnamon Apple Pocket', 'Crisp pastry filled with warm cinnamon apple.', 89, 'Desserts', '1568571780765-9276ac8b75a2', false, true, sideOptions],
].map(([id, name, description, price, category, photo, popular, vegetarian, options]) => ({ id, name, description, price, category, image: image(photo), popular, vegetarian, options }));

export const featuredItems = menuItems.filter((item) => item.popular);
