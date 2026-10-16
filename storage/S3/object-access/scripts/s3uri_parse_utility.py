from urllib.parse import urlparse

def parse_s3_uri_with_urllib(s3_uri):
    """
    Parse an S3 URI using urllib
    
    Args:
        s3_uri (str): S3 URI in format 's3://bucket-name/prefix/path'
        
    Returns:
        tuple: (bucket_name, prefix)
    """
    parsed = urlparse(s3_uri)
    bucket_name = parsed.netloc
    prefix = parsed.path.lstrip('/')
    
    return bucket_name, prefix


# Error handling example
def safe_parse_s3_uri(s3_uri):
    """
    Safely parse S3 URI with error handling
    
    Args:
        s3_uri (str): S3 URI in format 's3://bucket-name/prefix/path'
        
    Returns:
        tuple: (bucket_name, prefix) or (None, None) if invalid
    """
    try:
        if not isinstance(s3_uri, str):
            raise ValueError("S3 URI must be a string")
            
        if not s3_uri.startswith('s3://'):
            raise ValueError("Invalid S3 URI. Must start with 's3://'")
            
        # Remove 's3://' and any trailing slashes
        path = s3_uri[5:].rstrip('/')
        
        # Handle empty path
        if not path:
            raise ValueError("Empty bucket name")
            
        # Split into bucket and prefix
        parts = path.split('/', 1)
        
        bucket_name = parts[0]
        if not bucket_name:
            raise ValueError("Empty bucket name")
            
        # Validate bucket name according to S3 naming rules
        if not (3 <= len(bucket_name) <= 63):
            raise ValueError("Bucket name length must be between 3 and 63 characters")
            
        prefix = parts[1] if len(parts) > 1 else ''
        
        return bucket_name, prefix
        
    except Exception as e:
        print(f"Error parsing S3 URI '{s3_uri}': {str(e)}")
        return None, None

# Example usage with real-world scenarios:
def example_usage():
    # Example 1: Basic usage
    uri1 = 's3://my-bucket/data/2023/files/'
    bucket1, prefix1 = safe_parse_s3_uri(uri1)
    print(f"Bucket: {bucket1}, Prefix: {prefix1}")
    # Output: Bucket: my-bucket, Prefix: data/2023/files
    
    # Example 2: URI with file name
    uri2 = 's3://my-bucket/path/to/file.csv'
    bucket2, prefix2 = safe_parse_s3_uri(uri2)
    print(f"Bucket: {bucket2}, Prefix: {prefix2}")
    # Output: Bucket: my-bucket, Prefix: path/to/file.csv
    
    # Example 3: Invalid URI
    uri3 = 'https://XXXXXXXXXXXXXXXXXXXXXXXXXX/file.txt'
    bucket3, prefix3 = safe_parse_s3_uri(uri3)
    print(f"Bucket: {bucket3}, Prefix: {prefix3}")
    # Output: Error parsing S3 URI... None, None
    
    # Example 4: Using with boto3
    import boto3
    
    uri4 = 's3://my-bucket/data/file.txt'
    bucket4, prefix4 = safe_parse_s3_uri(uri4)
    print(f"Bucket: {bucket3}, Prefix: {prefix3}")

# Usage examples:
def main():
    # Example URIs
    test_uris = [
        's3://my-bucket/folder1/folder2/file.txt',
        's3://my-bucket/file.txt',
        's3://my-bucket/',
        's3://my-bucket'
    ]
    
    print("\nUsing urllib parsing:")
    for uri in test_uris:
        try:
            bucket, prefix = parse_s3_uri_with_urllib(uri)
            print(f"\nURI: {uri}")
            print(f"Bucket: {bucket}")
            print(f"Prefix: {prefix}")
        except ValueError as e:
            print(f"Error parsing {uri}: {e}")

    example_usage()

if __name__ == "__main__":
    main()
