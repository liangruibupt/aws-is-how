import json
import base64

image_mirrors = {
  'k8s.gcr.io/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/gcr/google_containers/',
  'gcr.io/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/gcr/',
  'asia.gcr.io/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/gcr/',
  'eu.gcr.io/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/gcr/',
  'us.gcr.io/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/gcr/',
  'quay.io/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/quay/',
  '602401143452.dkr.ecr.us-west-2.amazonaws.com/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/amazonecr/',
  '/': '048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/',
  'direct.to/': ''
}

def handler(event, context):
  request_body = json.loads(event['body'])
  json_patch = []
  # get initContainers from request and replace image path with JSON Patch
  initContainers = dict_get(request_body, 'request.object.spec.initContainers')
  if initContainers:
    json_patch += image_patch(initContainers, '/spec/initContainers')
  # get containters from request and replace image path with JSON Patch
  containers = dict_get(request_body, 'request.object.spec.containers')
  if containers:
    json_patch += image_patch(containers, '/spec/containers')
  print(json.dumps(json_patch))
  # set response body
  patch_b64 = base64.b64encode(json.dumps(json_patch))
  response_body = {
    'response': {
      'allowed': True,
      'patch': patch_b64,
      'patchType': 'JSONPatch'
    }
  }
  
  return {
    'body': json.dumps(response_body),
    'headers': {
      'Content-Type': 'application/json'
    },
    'statusCode': 200
  }

def dict_get(dictionary, keys, default=None):
  return reduce(lambda d, key: d.get(key, default) if isinstance(d, dict) else default, keys.split("."), dictionary)

def image_patch(containers, path_prefix):
  json_patch = []
  for idx, container in enumerate(containers):
    image = container['image']
    math_mirror=False
    for orig_image, mirror_image in image_mirrors.iteritems():
      if image.startswith(orig_image):
        math_mirror=True
        image = mirror_image + image[len(orig_image):]
        break
    if "/" in image_mirrors and math_mirror==False:
      if image.startswith("docker.io/"):
        image = image_mirrors["/"] + image[len("docker.io/"):]
      elif ("." not in image.split("/")[0]) or ("/" not in image):
        image =  image_mirrors["/"] + image
    json_patch.append({'op': 'replace', 'path': '%s/%d/image' % (path_prefix, idx), 'value': image})
  return json_patch
