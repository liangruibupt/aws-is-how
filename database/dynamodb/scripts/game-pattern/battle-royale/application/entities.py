class User:

    def __init__(self, item):
        self.username = item.get('username').get('S')
        self.name = item.get('name').get('S')
        self.email = item.get('email').get('S')
        self.birthdate = item.get('birthdate').get('S')
        self.address = item.get('address').get('S')

    def __repr__(self):
        return "User<{} -- {}>".format(self.username, self.name)


class Game:

    def __init__(self, item):
        self.game_id = item.get('game_id').get('S')
        self.map = item.get('map').get('S')
        self.creator = item.get('creator').get('S')
        self.create_time = item.get('create_time').get('S')
        self.start_time = item.get('start_time', {}).get('S')
        self.end_time = item.get('end_time', {}).get('S')

    def __repr__(self):
        return "Game<{} -- {}>".format(self.game_id, self.map)


class UserGameMapping:

    def __init__(self, item):
        self.game_id = item.get('game_id').get('S')
        self.username = item.get('username').get('S')
        self.place = item.get('place', {}).get('S')

    def __repr__(self):
        if self.place:
            return "UserGameMapping<{} -- {} -- {}>".format(self.game_id, self.username, self.place.upper())
        return "UserGameMapping<{} -- {}>".format(self.game_id, self.username)
