import json

def sort_dictionary_by_key_length(file_path="dictionary.json"):
    """
    Reads a JSON file containing a dictionary, sorts its items by the length
    of the keys (Chinese characters) in descending order, and saves the sorted
    dictionary back to the same file, replacing the old content.

    Args:
        file_path (str): The path to the dictionary.json file.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            dictionary_data = json.load(f)

        # Ensure the loaded data is a dictionary
        if not isinstance(dictionary_data, dict):
            print(f"Error: The content of '{file_path}' is not a dictionary. No changes made.")
            return

        # Sort the dictionary items by the length of the keys in descending order
        sorted_items = sorted(dictionary_data.items(), key=lambda item: len(item[0]), reverse=True)

        # Convert the sorted list of tuples back into a dictionary
        sorted_dictionary = dict(sorted_items)

        # Save the sorted dictionary back to the original file, overwriting it
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sorted_dictionary, f, ensure_ascii=False, indent=4)

        print(f"Dictionary sorted by the length of Chinese characters (keys) in descending order.")
        print(f"The sorted dictionary has been saved to '{file_path}', replacing the old content.")

    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{file_path}'. Please ensure it's valid JSON. No changes made.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    sort_dictionary_by_key_length()
