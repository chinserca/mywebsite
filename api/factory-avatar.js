const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;

module.exports = async function handler(req, res) {
 if (req.method !== 'GET') return res.status(405).json({error:'Use GET.'});
 const {username} = req.query ?? {};
 if (typeof username !== 'string' || !usernamePattern.test(username)) {
  return res.status(400).json({error:'Enter a Roblox username.'});
 }
 try {
  const signal = AbortSignal.timeout(4500);
  const users = await fetch('https://users.roblox.com/v1/usernames/users', {
   method:'POST', headers:{'Content-Type':'application/json'}, signal,
   body:JSON.stringify({usernames:[username],excludeBannedUsers:true})
  });
  if (!users.ok) throw new Error('Roblox lookup failed');
  const {data:[user]} = await users.json();
  if (!user) return res.status(404).json({error:'Roblox username not found. Check the spelling.'});
  const thumbnails = await fetch(
   'https://thumbnails.roblox.com/v1/users/avatar?userIds='+user.id+'&size=420x420&format=Png&isCircular=false',
   {signal}
  );
  if (!thumbnails.ok) throw new Error('Roblox thumbnail failed');
  const {data:[avatar]} = await thumbnails.json();
  if (avatar?.state !== 'Completed' || !/^https:\/\/[a-z0-9-]+\.rbxcdn\.com\//i.test(avatar.imageUrl)) {
   return res.status(503).json({error:'Roblox is still preparing this avatar. Try again shortly.'});
  }
  res.setHeader('Cache-Control','public, s-maxage=300');
  return res.status(200).json({username:user.name,image:avatar.imageUrl});
 } catch {
  return res.status(503).json({error:'Roblox avatars are unavailable right now. Try again shortly.'});
 }
};
