// UAT candidate only. Not deployed to the shared backend.
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return out({error:'method_not_allowed'},405);
 const authorization=req.headers.get('Authorization')||'';
 if(!authorization.toLowerCase().startsWith('bearer '))return out({error:'unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!key)return out({error:'configuration_unavailable'},503);
 const headers={Authorization:authorization,apikey:key};
 try{
  const auth=await fetch(url+'/auth/v1/user',{headers});if(!auth.ok)return out({error:'unauthorized'},401);
  const user=await auth.json();if(!user?.id)return out({error:'unauthorized'},401);
  const profile=await fetch(url+'/rest/v1/profiles?select=id,role,is_active&id=eq.'+encodeURIComponent(user.id)+'&is_active=eq.true',{headers});
  if(!profile.ok)return out({error:'profile_unavailable'},503);
  const rows=await profile.json();if(!Array.isArray(rows)||rows.length!==1||!['founder','cfmp','bm','als','lo'].includes(String(rows[0].role).toLowerCase()))return out({error:'forbidden'},403);
  const body=await req.json(),q=String(body?.q||'').trim();if(q.length<2)return out({data:[]});if(q.length>200)return out({error:'query_too_long'},400);
  // Caller JWT reaches the invoker RPC and client RLS. Never use service-role search.
  const response=await fetch(url+'/rest/v1/rpc/limited_global_client_search',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({p_query:q})});
  if(!response.ok)return out({error:'search_failed'},response.status===403?403:400);
  const results=await response.json();if(!Array.isArray(results))return out({error:'invalid_search_response'},503);
  const limit=Math.max(1,Math.min(Number(body?.limit)||50,50));
  return out({data:results.filter(r=>r.in_scope===true).slice(0,limit)});
 }catch{return out({error:'search_unavailable'},503)}
});
